import { CallStatus, CallType, Prisma } from '@prisma/client';
import { prisma } from '@/shared/database/prisma';
import { getTelephonyProvider } from '../../infrastructure/telephony-provider';
import {
  CallAuthorizationError,
  CallSessionNotFoundError,
  CallWindowExpiredError,
} from '../../domain/errors';
import { validateCallStateTransition } from '../../domain/call-state-machine';
import {
  CallSessionDTO,
  DirectCallResponse,
  TelephonyWebhookPayload,
} from '../../domain/types';
import { insertOutboxEvent } from '@/shared/outbox/outbox-service';
import { env } from '@/shared/config/env';

export function maskPhoneNumber(phone?: string | null): string | null {
  if (!phone) return null;
  const cleaned = phone.trim();
  if (cleaned.length <= 6) {
    return '***-***';
  }
  const prefix = cleaned.substring(0, Math.min(4, Math.floor(cleaned.length / 2)));
  const suffix = cleaned.substring(cleaned.length - 3);
  return `${prefix}****${suffix}`;
}

export function toCallSessionDTO(session: Record<string, unknown>): CallSessionDTO {
  return {
    id: String(session.id),
    provider: String(session.provider),
    providerCallId: session.providerCallId ? String(session.providerCallId) : null,
    callType: session.callType as CallType,
    status: session.status as CallStatus,
    initiatedByUserId: String(session.initiatedByUserId),
    customerId: String(session.customerId),
    driverProfileId: session.driverProfileId ? String(session.driverProfileId) : null,
    bookingId: session.bookingId ? String(session.bookingId) : null,
    supportTicketId: session.supportTicketId ? String(session.supportTicketId) : null,
    callerPhoneMasked: session.callerPhoneMasked
      ? String(session.callerPhoneMasked)
      : maskPhoneNumber(session.callerPhone as string | null),
    recipientPhoneMasked: session.recipientPhoneMasked
      ? String(session.recipientPhoneMasked)
      : maskPhoneNumber(session.recipientPhone as string | null),
    startedAt: session.startedAt instanceof Date ? session.startedAt.toISOString() : String(session.startedAt),
    answeredAt: session.answeredAt ? (session.answeredAt instanceof Date ? session.answeredAt.toISOString() : String(session.answeredAt)) : null,
    endedAt: session.endedAt ? (session.endedAt instanceof Date ? session.endedAt.toISOString() : String(session.endedAt)) : null,
    durationSeconds: typeof session.durationSeconds === 'number' ? session.durationSeconds : null,
    failureReason: session.failureReason ? String(session.failureReason) : null,
    createdAt: session.createdAt instanceof Date ? session.createdAt.toISOString() : String(session.createdAt),
    updatedAt: session.updatedAt instanceof Date ? session.updatedAt.toISOString() : String(session.updatedAt),
  };
}

export class CallingService {
  /**
   * Initiates a customer to driver proxy call for an active booking.
   */
  async initiateCustomerToDriverCall(
    customerUserId: string,
    bookingId: string,
  ): Promise<DirectCallResponse> {
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        customer: { select: { id: true, phone: true, phoneNumber: true } },
        driverProfile: {
          include: {
            user: { select: { id: true, phone: true, phoneNumber: true } },
          },
        },
      },
    });

    if (!booking) {
      throw new CallAuthorizationError('Booking not found.');
    }

    if (booking.customerId !== customerUserId) {
      throw new CallAuthorizationError('You do not have permission to initiate a call for this booking.');
    }

    if (!booking.driverProfile || !booking.driverProfileId) {
      throw new CallAuthorizationError('No driver has been assigned to this booking yet.');
    }

    // Check if within allowed call window (Active booking or COMPLETED within window minutes)
    this.assertCallWindowValid(booking);

    const customerPhone =
      booking.customer.phone ||
      ((booking.customer as Record<string, unknown>).phoneNumber as string) ||
      '+910000000000';
    const driverPhone =
      booking.driverProfile.user.phone ||
      ((booking.driverProfile.user as Record<string, unknown>).phoneNumber as string) ||
      '+910000000000';

    const proxyNumber = env.TELEPHONY_PROXY_NUMBER || '+911800000000';
    const callerMasked = maskPhoneNumber(customerPhone);
    const recipientMasked = maskPhoneNumber(driverPhone);

    // Create session & call provider in transaction
    const callSession = await prisma.callSession.create({
      data: {
        provider: env.TELEPHONY_PROVIDER ? env.TELEPHONY_PROVIDER.toUpperCase() : 'MOCK',
        callType: CallType.CUSTOMER_TO_DRIVER,
        status: CallStatus.INITIATED,
        initiatedByUserId: customerUserId,
        customerId: customerUserId,
        driverProfileId: booking.driverProfileId,
        bookingId: booking.id,
        callerPhoneMasked: callerMasked,
        recipientPhoneMasked: recipientMasked,
      },
    });

    const provider = getTelephonyProvider();
    const result = await provider.initiateCall({
      sessionId: callSession.id,
      callerPhone: customerPhone,
      recipientPhone: driverPhone,
      proxyNumber,
      callType: CallType.CUSTOMER_TO_DRIVER,
    });

    const updatedSession = await prisma.callSession.update({
      where: { id: callSession.id },
      data: {
        providerCallId: result.providerCallId,
        status: result.status,
      },
    });

    await insertOutboxEvent(prisma, {
      aggregateType: 'CALL_SESSION',
      aggregateId: updatedSession.id,
      eventType: 'calling.session_initiated',
      payload: {
        sessionId: updatedSession.id,
        bookingId: booking.id,
        callType: CallType.CUSTOMER_TO_DRIVER,
        customerId: customerUserId,
        driverProfileId: booking.driverProfileId,
      },
    });

    return {
      callSessionId: updatedSession.id,
      status: updatedSession.status,
      provider: updatedSession.provider,
      providerCallId: updatedSession.providerCallId,
      callerPhoneMasked: callerMasked,
      recipientPhoneMasked: recipientMasked,
      dialNumber: proxyNumber,
      instructions: 'Your call is being connected securely through our masked proxy number.',
    };
  }

  /**
   * Initiates a driver to customer proxy call for an assigned booking.
   */
  async initiateDriverToCustomerCall(
    driverUserId: string,
    bookingId: string,
  ): Promise<DirectCallResponse> {
    const driverProfile = await prisma.driverProfile.findUnique({
      where: { userId: driverUserId },
      include: { user: { select: { id: true, phone: true, phoneNumber: true } } },
    });

    if (!driverProfile) {
      throw new CallAuthorizationError('Driver profile not found.');
    }

    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        customer: { select: { id: true, phone: true, phoneNumber: true } },
      },
    });

    if (!booking) {
      throw new CallAuthorizationError('Booking not found.');
    }

    if (booking.driverProfileId !== driverProfile.id) {
      throw new CallAuthorizationError('You are not assigned to this booking.');
    }

    this.assertCallWindowValid(booking);

    const driverPhone =
      driverProfile.user.phone ||
      ((driverProfile.user as Record<string, unknown>).phoneNumber as string) ||
      '+910000000000';
    const customerPhone =
      booking.customer.phone ||
      ((booking.customer as Record<string, unknown>).phoneNumber as string) ||
      '+910000000000';

    const proxyNumber = env.TELEPHONY_PROXY_NUMBER || '+911800000000';
    const callerMasked = maskPhoneNumber(driverPhone);
    const recipientMasked = maskPhoneNumber(customerPhone);

    const callSession = await prisma.callSession.create({
      data: {
        provider: env.TELEPHONY_PROVIDER ? env.TELEPHONY_PROVIDER.toUpperCase() : 'MOCK',
        callType: CallType.DRIVER_TO_CUSTOMER,
        status: CallStatus.INITIATED,
        initiatedByUserId: driverUserId,
        customerId: booking.customerId,
        driverProfileId: driverProfile.id,
        bookingId: booking.id,
        callerPhoneMasked: callerMasked,
        recipientPhoneMasked: recipientMasked,
      },
    });

    const provider = getTelephonyProvider();
    const result = await provider.initiateCall({
      sessionId: callSession.id,
      callerPhone: driverPhone,
      recipientPhone: customerPhone,
      proxyNumber,
      callType: CallType.DRIVER_TO_CUSTOMER,
    });

    const updatedSession = await prisma.callSession.update({
      where: { id: callSession.id },
      data: {
        providerCallId: result.providerCallId,
        status: result.status,
      },
    });

    await insertOutboxEvent(prisma, {
      aggregateType: 'CALL_SESSION',
      aggregateId: updatedSession.id,
      eventType: 'calling.session_initiated',
      payload: {
        sessionId: updatedSession.id,
        bookingId: booking.id,
        callType: CallType.DRIVER_TO_CUSTOMER,
        customerId: booking.customerId,
        driverProfileId: driverProfile.id,
      },
    });

    return {
      callSessionId: updatedSession.id,
      status: updatedSession.status,
      provider: updatedSession.provider,
      providerCallId: updatedSession.providerCallId,
      callerPhoneMasked: callerMasked,
      recipientPhoneMasked: recipientMasked,
      dialNumber: proxyNumber,
      instructions: 'Connecting to customer via secure masked call bridge.',
    };
  }

  /**
   * Initiates a direct call to Customer Care (Support).
   */
  async initiateSupportCall(
    userId: string,
    supportTicketId?: string,
    _reason?: string,
  ): Promise<DirectCallResponse> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, phone: true, phoneNumber: true, role: true },
    });

    if (!user) {
      throw new CallAuthorizationError('User profile not found.');
    }

    // Check if driver profile exists if driver
    let driverProfileId: string | null = null;
    if (user.role === 'DRIVER') {
      const dp = await prisma.driverProfile.findUnique({ where: { userId } });
      if (dp) driverProfileId = dp.id;
    }

    const callerPhone =
      user.phone ||
      ((user as Record<string, unknown>).phoneNumber as string) ||
      '+910000000000';
    const supportNumber = env.TELEPHONY_SUPPORT_NUMBER || '+9118002761000';

    const callerMasked = maskPhoneNumber(callerPhone);
    const recipientMasked = maskPhoneNumber(supportNumber);

    const callType = user.role === 'DRIVER' ? CallType.DRIVER_TO_SUPPORT : CallType.CUSTOMER_TO_SUPPORT;

    const callSession = await prisma.callSession.create({
      data: {
        provider: env.TELEPHONY_PROVIDER ? env.TELEPHONY_PROVIDER.toUpperCase() : 'MOCK',
        callType,
        status: CallStatus.INITIATED,
        initiatedByUserId: userId,
        customerId: user.role === 'CUSTOMER' ? userId : userId,
        driverProfileId,
        supportTicketId: supportTicketId || null,
        callerPhoneMasked: callerMasked,
        recipientPhoneMasked: recipientMasked,
      },
    });

    const provider = getTelephonyProvider();
    const result = await provider.initiateCall({
      sessionId: callSession.id,
      callerPhone,
      recipientPhone: supportNumber,
      proxyNumber: supportNumber,
      callType,
    });

    const updatedSession = await prisma.callSession.update({
      where: { id: callSession.id },
      data: {
        providerCallId: result.providerCallId,
        status: result.status,
      },
    });

    await insertOutboxEvent(prisma, {
      aggregateType: 'CALL_SESSION',
      aggregateId: updatedSession.id,
      eventType: 'calling.session_initiated',
      payload: {
        sessionId: updatedSession.id,
        callType,
        initiatedByUserId: userId,
        supportTicketId: supportTicketId || null,
      },
    });

    return {
      callSessionId: updatedSession.id,
      status: updatedSession.status,
      provider: updatedSession.provider,
      providerCallId: updatedSession.providerCallId,
      callerPhoneMasked: callerMasked,
      recipientPhoneMasked: recipientMasked,
      dialNumber: supportNumber,
      instructions: 'Connecting to Get Apna Driver Customer Care helpline.',
    };
  }

  /**
   * Processes webhook updates from telephony provider (Exotel/Mock).
   */
  async handleTelephonyWebhook(payload: TelephonyWebhookPayload): Promise<CallSessionDTO | null> {
    const session = await prisma.callSession.findFirst({
      where: {
        OR: [
          { providerCallId: payload.providerCallId },
          { id: payload.providerCallId },
        ],
      },
    });

    if (!session) {
      return null;
    }

    validateCallStateTransition(session.status, payload.status);

    const updateData: Prisma.CallSessionUpdateInput = {
      status: payload.status,
    };

    if (payload.status === CallStatus.ANSWERED && !session.answeredAt) {
      updateData.answeredAt = payload.timestamp || new Date();
    }

    if (
      (payload.status === CallStatus.COMPLETED ||
        payload.status === CallStatus.FAILED ||
        payload.status === CallStatus.CANCELLED) &&
      !session.endedAt
    ) {
      updateData.endedAt = payload.timestamp || new Date();
      if (payload.durationSeconds !== undefined) {
        updateData.durationSeconds = payload.durationSeconds;
      } else if (session.startedAt) {
        const ended = updateData.endedAt as Date;
        updateData.durationSeconds = Math.max(0, Math.floor((ended.getTime() - session.startedAt.getTime()) / 1000));
      }
    }

    if (payload.failureReason) {
      updateData.failureReason = payload.failureReason;
    }

    const updatedSession = await prisma.callSession.update({
      where: { id: session.id },
      data: updateData,
    });

    const isCompleted =
      updatedSession.status === CallStatus.COMPLETED ||
      updatedSession.status === CallStatus.FAILED ||
      updatedSession.status === CallStatus.CANCELLED;

    await insertOutboxEvent(prisma, {
      aggregateType: 'CALL_SESSION',
      aggregateId: updatedSession.id,
      eventType: isCompleted ? 'calling.session_completed' : 'calling.session_status_changed',
      payload: {
        sessionId: updatedSession.id,
        status: updatedSession.status,
        durationSeconds: updatedSession.durationSeconds,
        failureReason: updatedSession.failureReason,
      },
    });

    return toCallSessionDTO(updatedSession);
  }

  /**
   * Get single call session details with caller auth check.
   */
  async getCallSessionDetail(
    userId: string,
    userRole: string,
    sessionId: string,
  ): Promise<CallSessionDTO> {
    const session = await prisma.callSession.findUnique({
      where: { id: sessionId },
    });

    if (!session) {
      throw new CallSessionNotFoundError(sessionId);
    }

    if (userRole !== 'ADMINISTRATOR' && userRole !== 'ADMIN') {
      const isCustomer = session.customerId === userId;

      let isDriver = false;
      if (session.driverProfileId) {
        const dp = await prisma.driverProfile.findUnique({ where: { userId } });
        if (dp && dp.id === session.driverProfileId) {
          isDriver = true;
        }
      }

      if (!isCustomer && !isDriver && session.initiatedByUserId !== userId) {
        throw new CallAuthorizationError('Access denied to view call session.');
      }
    }

    return toCallSessionDTO(session);
  }

  /**
   * List call history for a user or admin.
   */
  async listUserCallHistory(
    userId: string,
    userRole: string,
    options: { page?: number; limit?: number } = {},
  ) {
    const page = Math.max(1, options.page || 1);
    const limit = Math.min(100, Math.max(1, options.limit || 20));
    const skip = (page - 1) * limit;

    let where: Prisma.CallSessionWhereInput = {};

    if (userRole === 'ADMINISTRATOR' || userRole === 'ADMIN') {
      where = {};
    } else if (userRole === 'DRIVER') {
      const dp = await prisma.driverProfile.findUnique({ where: { userId } });
      where = {
        OR: [
          { initiatedByUserId: userId },
          ...(dp ? [{ driverProfileId: dp.id }] : []),
        ],
      };
    } else {
      where = {
        OR: [
          { initiatedByUserId: userId },
          { customerId: userId },
        ],
      };
    }

    const [total, sessions] = await Promise.all([
      prisma.callSession.count({ where }),
      prisma.callSession.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
    ]);

    return {
      data: sessions.map((s) => toCallSessionDTO(s)),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  private assertCallWindowValid(booking: { status: string; updatedAt: Date | string }): void {
    const validStatuses = ['ASSIGNED', 'ACCEPTED', 'ARRIVED', 'IN_PROGRESS', 'COMPLETED'];
    if (!validStatuses.includes(booking.status)) {
      throw new CallAuthorizationError(`Cannot initiate call for booking in '${booking.status}' status.`);
    }

    if (booking.status === 'COMPLETED') {
      const windowMinutes = env.DRIVER_CUSTOMER_CALL_WINDOW_MINUTES || 30;
      const windowMs = windowMinutes * 60 * 1000;
      const completedTime = new Date(booking.updatedAt).getTime();
      const now = Date.now();

      if (now - completedTime > windowMs) {
        throw new CallWindowExpiredError(
          `Call window expired. Calls are only permitted within ${windowMinutes} minutes of booking completion.`,
        );
      }
    }
  }
}

export const callingService = new CallingService();
