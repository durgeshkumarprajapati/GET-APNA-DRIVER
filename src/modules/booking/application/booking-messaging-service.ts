import 'server-only';
import { BookingStatus } from '@prisma/client';
import { prisma, type Db } from '@/shared/database/prisma';
import { insertOutboxEvent } from '@/shared/outbox/outbox-service';
import {
  BookingNotFoundError,
  MessagingNotAuthorizedError,
  MessagingNotAllowedError,
} from '../domain/errors';
import { ValidationError } from '@/shared/errors/app-error';

const MESSAGE_BODY_MAX_LENGTH = 500;
const MESSAGE_PREVIEW_LENGTH = 140;

/**
 * Sending a NEW message is allowed during active driver-service lifecycle stages.
 * Reading history remains accessible after completion/cancellation in read-only mode.
 */
const SENDABLE_STATUSES: BookingStatus[] = [
  BookingStatus.SEARCHING_DRIVER,
  BookingStatus.DRIVER_ASSIGNED,
  BookingStatus.DRIVER_EN_ROUTE,
  BookingStatus.DRIVER_ARRIVED,
  BookingStatus.TRIP_IN_PROGRESS,
];

export interface BookingMessageDTO {
  id: string;
  bookingId: string;
  senderUserId: string;
  senderRole: 'CUSTOMER' | 'DRIVER' | 'SYSTEM';
  messageType: 'TEXT' | 'QUICK_REPLY' | 'SYSTEM';
  body: string;
  readAt: Date | null;
  createdAt: Date;
}

export interface ListBookingMessagesResult {
  messages: BookingMessageDTO[];
  unreadCount: number;
  canCommunicate: {
    allowed: boolean;
    reason?: string;
    status: string;
  };
}

export const QUICK_MESSAGES = {
  CUSTOMER: [
    { key: 'CUST_PICKUP_LOCATION', text: 'I am at the pickup location.' },
    { key: 'CUST_CALL_ME', text: 'Please call me.' },
    { key: 'CUST_MAIN_GATE', text: 'I am near the main gate.' },
    { key: 'CUST_WAIT_5_MIN', text: 'Please wait 5 minutes.' },
    { key: 'CUST_CANNOT_FIND_PICKUP', text: 'I cannot find the pickup point.' },
    { key: 'CUST_CHECK_INSTRUCTIONS', text: 'Please check the pickup instructions.' },
  ],
  DRIVER: [
    { key: 'DRIVER_ON_MY_WAY', text: 'I am on my way.' },
    { key: 'DRIVER_ARRIVED', text: 'I have arrived at the pickup point.' },
    { key: 'DRIVER_PLEASE_COME', text: 'Please come to the pickup location.' },
    { key: 'DRIVER_WAITING_GATE', text: 'I am waiting near the gate.' },
    { key: 'DRIVER_CALL_ME', text: 'Please call me.' },
    { key: 'DRIVER_CANNOT_LOCATE_PICKUP', text: 'I cannot locate the pickup point.' },
  ],
};

interface MessagingParticipant {
  role: 'CUSTOMER' | 'DRIVER';
  counterpartUserId: string | null;
}

/**
 * Resolves whether `userId` may participate in this booking's message thread.
 * IDOR protection: verifies customer ownership or assigned/offered driver match.
 */
export async function resolveMessagingParticipant(
  userId: string,
  booking: {
    id: string;
    customerId: string;
    driverProfileId: string | null;
    preferredDriverProfileId: string | null;
  },
  db: Db,
): Promise<MessagingParticipant | null> {
  if (booking.customerId === userId) {
    const driverProfileId = booking.driverProfileId ?? booking.preferredDriverProfileId;
    if (!driverProfileId) return null;
    const driverProfile = await db.driverProfile.findUnique({
      where: { id: driverProfileId },
      select: { userId: true },
    });
    return { role: 'CUSTOMER', counterpartUserId: driverProfile?.userId ?? null };
  }

  const callerDriverProfile = await db.driverProfile.findUnique({ where: { userId } });
  if (!callerDriverProfile) return null;

  const isAssigned = booking.driverProfileId === callerDriverProfile.id;
  const isPreferred = booking.preferredDriverProfileId === callerDriverProfile.id;
  const hasAttempt = isAssigned
    ? true
    : !!(await (
        db as unknown as {
          bookingAssignmentAttempt: {
            findFirst: (args: unknown) => Promise<{ id: string } | null>;
          };
        }
      ).bookingAssignmentAttempt.findFirst({
        where: { bookingId: booking.id, driverProfileId: callerDriverProfile.id },
        select: { id: true },
      }));

  if (!isAssigned && !isPreferred && !hasAttempt) return null;
  return { role: 'DRIVER', counterpartUserId: booking.customerId };
}

/**
 * Sends an operational message on a booking thread (customer or driver).
 * Validates lifecycle, trims text, persists to DB, and triggers outbox realtime event.
 */
export async function sendBookingMessage(
  senderUserId: string,
  bookingId: string,
  body: string,
  options?: { messageType?: 'TEXT' | 'QUICK_REPLY' },
  db: Db = prisma,
): Promise<BookingMessageDTO> {
  const trimmedBody = body.trim();
  if (!trimmedBody) {
    throw new ValidationError('Message body cannot be empty.', 'EMPTY_MESSAGE_BODY');
  }

  const booking = await db.booking.findUnique({ where: { id: bookingId } });
  if (!booking) {
    throw new BookingNotFoundError(bookingId);
  }

  const participant = await resolveMessagingParticipant(senderUserId, booking, db);
  if (!participant) {
    throw new MessagingNotAuthorizedError(bookingId);
  }
  if (!SENDABLE_STATUSES.includes(booking.status)) {
    throw new MessagingNotAllowedError(bookingId, booking.status);
  }

  const messageType = options?.messageType ?? 'TEXT';

  const message = await (
    db as unknown as {
      bookingMessage: { create: (args: unknown) => Promise<Record<string, unknown>> };
    }
  ).bookingMessage.create({
    data: {
      bookingId,
      senderUserId,
      senderRole: participant.role,
      messageType,
      body: trimmedBody.slice(0, MESSAGE_BODY_MAX_LENGTH),
    },
  });

  if (participant.counterpartUserId) {
    await insertOutboxEvent(db, {
      eventType: 'booking.message.sent',
      aggregateType: 'BookingMessage',
      aggregateId: String(message.id),
      payload: {
        bookingId,
        messageId: String(message.id),
        senderUserId,
        senderRole: participant.role,
        recipientUserId: participant.counterpartUserId,
        recipientRole: participant.role === 'CUSTOMER' ? 'DRIVER' : 'CUSTOMER',
        messageType,
        bodyPreview: String(message.body).slice(0, MESSAGE_PREVIEW_LENGTH),
      },
    });
  }

  return toDTO(message, participant.role);
}

/**
 * Creates a system operational notification message inside a booking thread.
 */
export async function createSystemBookingMessage(
  bookingId: string,
  body: string,
  db: Db = prisma,
): Promise<BookingMessageDTO | null> {
  const booking = await db.booking.findUnique({ where: { id: bookingId } });
  if (!booking) return null;

  const message = await (
    db as unknown as {
      bookingMessage: { create: (args: unknown) => Promise<Record<string, unknown>> };
    }
  ).bookingMessage.create({
    data: {
      bookingId,
      senderUserId: booking.customerId,
      senderRole: 'SYSTEM',
      messageType: 'SYSTEM',
      body,
    },
  });

  return toDTO(message, 'SYSTEM');
}

/**
 * Lists messages for a booking thread, with unread count and communication status.
 */
export async function listBookingMessages(
  userId: string,
  bookingId: string,
  db: Db = prisma,
): Promise<ListBookingMessagesResult> {
  const booking = await db.booking.findUnique({ where: { id: bookingId } });
  if (!booking) {
    throw new BookingNotFoundError(bookingId);
  }

  const participant = await resolveMessagingParticipant(userId, booking, db);
  if (!participant) {
    throw new MessagingNotAuthorizedError(bookingId);
  }

  const rawMessages = await (
    db as unknown as {
      bookingMessage: { findMany: (args: unknown) => Promise<Array<Record<string, unknown>>> };
    }
  ).bookingMessage.findMany({
    where: { bookingId },
    orderBy: { createdAt: 'asc' },
  });

  const messages: BookingMessageDTO[] = rawMessages.map((m) => {
    let role: 'CUSTOMER' | 'DRIVER' | 'SYSTEM' = 'CUSTOMER';
    if (m.senderRole) {
      role = m.senderRole as 'CUSTOMER' | 'DRIVER' | 'SYSTEM';
    } else if (m.senderUserId === booking.customerId) {
      role = 'CUSTOMER';
    } else {
      role = 'DRIVER';
    }
    return toDTO(m, role);
  });

  const unreadCount = rawMessages.filter(
    (m) => m.senderUserId !== userId && m.senderRole !== 'SYSTEM' && !m.readAt,
  ).length;

  const canSend = SENDABLE_STATUSES.includes(booking.status);

  return {
    messages,
    unreadCount,
    canCommunicate: {
      allowed: canSend,
      status: booking.status,
      reason: canSend
        ? undefined
        : booking.status === BookingStatus.TRIP_COMPLETED
          ? 'Service completed. Communication is closed.'
          : booking.status === BookingStatus.CANCELLED
            ? 'Service cancelled. Communication is closed.'
            : 'Service inactive.',
    },
  };
}

/**
 * Batch marks all unread incoming messages as read for a given participant.
 */
export async function markMessagesAsRead(
  userId: string,
  bookingId: string,
  db: Db = prisma,
): Promise<{ updatedCount: number }> {
  const booking = await db.booking.findUnique({ where: { id: bookingId } });
  if (!booking) {
    throw new BookingNotFoundError(bookingId);
  }

  const participant = await resolveMessagingParticipant(userId, booking, db);
  if (!participant) {
    throw new MessagingNotAuthorizedError(bookingId);
  }

  const now = new Date();
  const updateResult = await (
    db as unknown as {
      bookingMessage: { updateMany: (args: unknown) => Promise<{ count: number }> };
    }
  ).bookingMessage.updateMany({
    where: {
      bookingId,
      senderUserId: { not: userId },
      readAt: null,
    },
    data: {
      readAt: now,
    },
  });

  if (updateResult.count > 0 && participant.counterpartUserId) {
    await insertOutboxEvent(db, {
      eventType: 'booking.message.read',
      aggregateType: 'BookingMessage',
      aggregateId: bookingId,
      payload: {
        bookingId,
        readerUserId: userId,
        updatedCount: updateResult.count,
        readAt: now.toISOString(),
      },
    });
  }

  return { updatedCount: updateResult.count };
}

/**
 * Gets the number of unread messages for a participant in a booking.
 */
export async function getUnreadMessageCount(
  userId: string,
  bookingId: string,
  db: Db = prisma,
): Promise<number> {
  const count = await (
    db as unknown as { bookingMessage: { count: (args: unknown) => Promise<number> } }
  ).bookingMessage.count({
    where: {
      bookingId,
      senderUserId: { not: userId },
      readAt: null,
    },
  });
  return count;
}

function toDTO(
  message: Record<string, unknown>,
  senderRole: 'CUSTOMER' | 'DRIVER' | 'SYSTEM',
): BookingMessageDTO {
  return {
    id: String(message.id),
    bookingId: String(message.bookingId),
    senderUserId: String(message.senderUserId),
    senderRole,
    messageType: (message.messageType as 'TEXT' | 'QUICK_REPLY' | 'SYSTEM') ?? 'TEXT',
    body: String(message.body),
    readAt: (message.readAt as Date | null) ?? null,
    createdAt: message.createdAt as Date,
  };
}
