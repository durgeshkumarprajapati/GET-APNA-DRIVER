import 'server-only';
import {
  AssignmentAttemptStatus,
  BookingStatus,
  BookingType,
  DriverAvailabilityStatus,
} from '@prisma/client';
import { prisma, type Db } from '@/shared/database/prisma';
import { getInteger } from '@/shared/config/configuration-service';
import { recordAuditLog } from '@/shared/audit/audit-service';
import { insertOutboxEvent } from '@/shared/outbox/outbox-service';
import { realtime } from '@/shared/realtime/realtime-provider';
import { requirePermission } from '@/modules/identity/authorization/authorization-service';
import { PERMISSIONS } from '@/modules/identity/domain/permission-catalog';
import type { AuthenticatedPrincipal } from '@/modules/identity/domain/types';
import { getContactInfoForUsers } from '@/modules/identity/infrastructure/user-repository';
import { evaluateDriverEligibility } from '@/modules/driver/application/services/driver-eligibility-service';
import { DriverProfileNotFoundError } from '@/modules/driver/domain/errors';
import {
  addDriverToLiveIndex,
  removeDriverFromLiveIndex,
} from '@/modules/location/application/driver-location-service';
import { validateBookingStatusTransition } from '../domain/booking-state-machine';
import {
  BookingNotFoundError,
  DispatchInvalidBookingStateError,
  DriverNotAvailableForDispatchError,
  DriverNotEligibleForDispatchError,
} from '../domain/errors';
import { findAndOfferNextDriver } from './matching-service';

function driverDisplayName(profile: {
  displayName: string | null;
  firstName: string | null;
  lastName: string | null;
}): string {
  if (profile.displayName) return profile.displayName;
  const combined = [profile.firstName, profile.lastName].filter(Boolean).join(' ');
  return combined || 'Unnamed Driver';
}

export interface DispatchBookingSummary {
  id: string;
  status: BookingStatus;
  bookingType: BookingType;
  pickupAddress: string;
  requestedStartTime: Date | null;
  createdAt: Date;
  customer: { id: string; email: string | null; phoneNumber: string | null };
  assignedDriver: { id: string; name: string } | null;
  pendingAttemptCount: number;
}

export interface ListDispatchBookingsFilter {
  status?: BookingStatus;
  search?: string;
  page?: number;
  pageSize?: number;
}

export interface ListDispatchBookingsResult {
  bookings: DispatchBookingSummary[];
  total: number;
  page: number;
  pageSize: number;
}

const MAX_PAGE_SIZE = 100;
const DEFAULT_PAGE_SIZE = 25;

/** Admin-facing live booking directory. Read-only. */
export async function listDispatchBookings(
  filter: ListDispatchBookingsFilter = {},
  db: Db = prisma,
): Promise<ListDispatchBookingsResult> {
  const page = filter.page && filter.page > 0 ? filter.page : 1;
  const pageSize =
    filter.pageSize && filter.pageSize > 0
      ? Math.min(filter.pageSize, MAX_PAGE_SIZE)
      : DEFAULT_PAGE_SIZE;

  const where = {
    ...(filter.status ? { status: filter.status } : {}),
    ...(filter.search
      ? {
          customer: {
            identities: {
              some: {
                providerName: { in: ['email', 'phone'] },
                OR: [
                  { email: { contains: filter.search, mode: 'insensitive' as const } },
                  { phoneNumber: { contains: filter.search } },
                ],
              },
            },
          },
        }
      : {}),
  };

  const [bookings, total] = await Promise.all([
    db.booking.findMany({
      where,
      include: {
        driverProfile: true,
        assignmentAttempts: { where: { status: AssignmentAttemptStatus.PENDING } },
      },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    db.booking.count({ where }),
  ]);

  const contactInfo = await getContactInfoForUsers(
    db,
    bookings.map((booking) => booking.customerId),
  );

  return {
    bookings: bookings.map((booking) => ({
      id: booking.id,
      status: booking.status,
      bookingType: booking.bookingType,
      pickupAddress: booking.pickupAddress,
      requestedStartTime: booking.requestedStartTime,
      createdAt: booking.createdAt,
      customer: {
        id: booking.customerId,
        ...(contactInfo.get(booking.customerId) ?? { email: null, phoneNumber: null }),
      },
      assignedDriver: booking.driverProfile
        ? { id: booking.driverProfile.id, name: driverDisplayName(booking.driverProfile) }
        : null,
      pendingAttemptCount: booking.assignmentAttempts.length,
    })),
    total,
    page,
    pageSize,
  };
}

export interface DispatchAssignmentAttempt {
  id: string;
  attemptNumber: number;
  status: AssignmentAttemptStatus;
  offeredAt: Date;
  respondedAt: Date | null;
  expiresAt: Date;
  rejectionReason: string | null;
  driver: { id: string; name: string };
}

export interface DispatchBookingDetail {
  id: string;
  status: BookingStatus;
  bookingType: BookingType;
  pickupAddress: string;
  pickupLabel: string | null;
  requestedStartTime: Date | null;
  searchStartedAt: Date | null;
  assignedAt: Date | null;
  expiresAt: Date | null;
  createdAt: Date;
  customer: { id: string; email: string | null; phoneNumber: string | null };
  assignedDriver: { id: string; name: string; availabilityStatus: DriverAvailabilityStatus } | null;
  assignmentAttempts: DispatchAssignmentAttempt[];
}

/** Admin-facing single-booking detail with full assignment-attempt history. Read-only. */
export async function getDispatchBookingDetail(
  bookingId: string,
  db: Db = prisma,
): Promise<DispatchBookingDetail | null> {
  const booking = await db.booking.findUnique({
    where: { id: bookingId },
    include: {
      driverProfile: true,
      assignmentAttempts: {
        include: { driverProfile: true },
        orderBy: { attemptNumber: 'asc' },
      },
    },
  });
  if (!booking) return null;

  const contactInfo = await getContactInfoForUsers(db, [booking.customerId]);

  return {
    id: booking.id,
    status: booking.status,
    bookingType: booking.bookingType,
    pickupAddress: booking.pickupAddress,
    pickupLabel: booking.pickupLabel,
    requestedStartTime: booking.requestedStartTime,
    searchStartedAt: booking.searchStartedAt,
    assignedAt: booking.assignedAt,
    expiresAt: booking.expiresAt,
    createdAt: booking.createdAt,
    customer: {
      id: booking.customerId,
      ...(contactInfo.get(booking.customerId) ?? { email: null, phoneNumber: null }),
    },
    assignedDriver: booking.driverProfile
      ? {
          id: booking.driverProfile.id,
          name: driverDisplayName(booking.driverProfile),
          availabilityStatus: booking.driverProfile.availabilityStatus,
        }
      : null,
    assignmentAttempts: booking.assignmentAttempts.map((attempt) => ({
      id: attempt.id,
      attemptNumber: attempt.attemptNumber,
      status: attempt.status,
      offeredAt: attempt.offeredAt,
      respondedAt: attempt.respondedAt,
      expiresAt: attempt.expiresAt,
      rejectionReason: attempt.rejectionReason,
      driver: { id: attempt.driverProfile.id, name: driverDisplayName(attempt.driverProfile) },
    })),
  };
}

export interface ReassignBookingDriverInput {
  bookingId: string;
  actor: AuthenticatedPrincipal;
  reason: string;
}

/**
 * Operator-initiated reassignment: releases the currently-assigned driver
 * (restoring their availability) and reopens matching for the booking.
 * Only valid from DRIVER_ASSIGNED — see the state machine's comment on that
 * transition for why en-route/arrived bookings are out of scope.
 */
export async function reassignBookingDriver(
  input: ReassignBookingDriverInput,
  db: Db = prisma,
): Promise<DispatchBookingDetail> {
  const { bookingId, actor, reason } = input;
  requirePermission(actor, PERMISSIONS.DISPATCH_ASSIGNMENT_REASSIGN);

  const searchTimeoutSeconds = await getInteger('booking.matching.search_timeout_seconds', 300, db);

  const { previousDriverId } = await db.$transaction(async (tx) => {
    const booking = await tx.booking.findUnique({ where: { id: bookingId } });
    if (!booking) {
      throw new BookingNotFoundError(bookingId);
    }
    if (booking.status !== BookingStatus.DRIVER_ASSIGNED || !booking.driverProfileId) {
      throw new DispatchInvalidBookingStateError(bookingId, booking.status, [
        BookingStatus.DRIVER_ASSIGNED,
      ]);
    }
    validateBookingStatusTransition(booking.status, BookingStatus.SEARCHING_DRIVER);

    const previousDriverProfileId = booking.driverProfileId;
    const now = new Date();

    await tx.driverProfile.update({
      where: { id: previousDriverProfileId },
      data: { availabilityStatus: DriverAvailabilityStatus.AVAILABLE },
    });

    await tx.booking.update({
      where: { id: bookingId },
      data: {
        status: BookingStatus.SEARCHING_DRIVER,
        driverProfileId: null,
        assignedAt: null,
        searchStartedAt: now,
        expiresAt: new Date(now.getTime() + searchTimeoutSeconds * 1000),
      },
    });

    await tx.bookingLog.create({
      data: {
        bookingId,
        actorUserId: actor.userId,
        fromStatus: booking.status,
        toStatus: BookingStatus.SEARCHING_DRIVER,
        action: 'dispatch.driver.reassigned',
        reason,
      },
    });

    await insertOutboxEvent(tx, {
      eventType: 'dispatch.driver.reassigned',
      aggregateType: 'Booking',
      aggregateId: bookingId,
      payload: {
        bookingId,
        previousDriverProfileId,
        reassignedBy: actor.userId,
        reason,
      },
    });

    return { previousDriverId: previousDriverProfileId };
  });

  const eligibility = await evaluateDriverEligibility(previousDriverId, db);
  if (eligibility.isEligible) {
    await addDriverToLiveIndex(previousDriverId, db);
  }

  await recordAuditLog(db, {
    actorUserId: actor.userId,
    action: 'dispatch.driver.reassigned',
    entityType: 'Booking',
    entityId: bookingId,
    beforeState: { status: BookingStatus.DRIVER_ASSIGNED, driverProfileId: previousDriverId },
    afterState: { status: BookingStatus.SEARCHING_DRIVER, driverProfileId: null, reason },
  });

  realtime.publishBookingUpdate(bookingId, 'dispatch.driver.reassigned', { bookingId });

  try {
    await findAndOfferNextDriver(bookingId, db);
  } catch {
    // Matching continues asynchronously via the worker/next poll; never fail the reassignment on this.
  }

  const detail = await getDispatchBookingDetail(bookingId, db);
  if (!detail) {
    throw new BookingNotFoundError(bookingId);
  }
  return detail;
}

export interface RestartBookingSearchInput {
  bookingId: string;
  actor: AuthenticatedPrincipal;
  reason: string;
}

/**
 * Operator-initiated search restart. Only valid from EXPIRED — a booking
 * with a live SEARCHING_DRIVER process is already matching and restarting
 * it would create a duplicate active search, which this deliberately
 * refuses via DispatchInvalidBookingStateError.
 */
export async function restartBookingSearch(
  input: RestartBookingSearchInput,
  db: Db = prisma,
): Promise<DispatchBookingDetail> {
  const { bookingId, actor, reason } = input;
  requirePermission(actor, PERMISSIONS.DISPATCH_BOOKING_OVERRIDE);

  const searchTimeoutSeconds = await getInteger('booking.matching.search_timeout_seconds', 300, db);

  await db.$transaction(async (tx) => {
    const booking = await tx.booking.findUnique({ where: { id: bookingId } });
    if (!booking) {
      throw new BookingNotFoundError(bookingId);
    }
    if (booking.status !== BookingStatus.EXPIRED) {
      throw new DispatchInvalidBookingStateError(bookingId, booking.status, [
        BookingStatus.EXPIRED,
      ]);
    }
    validateBookingStatusTransition(booking.status, BookingStatus.SEARCHING_DRIVER);

    const now = new Date();
    await tx.booking.update({
      where: { id: bookingId },
      data: {
        status: BookingStatus.SEARCHING_DRIVER,
        searchStartedAt: now,
        expiresAt: new Date(now.getTime() + searchTimeoutSeconds * 1000),
      },
    });

    await tx.bookingLog.create({
      data: {
        bookingId,
        actorUserId: actor.userId,
        fromStatus: booking.status,
        toStatus: BookingStatus.SEARCHING_DRIVER,
        action: 'dispatch.search.restarted',
        reason,
      },
    });

    await insertOutboxEvent(tx, {
      eventType: 'dispatch.search.restarted',
      aggregateType: 'Booking',
      aggregateId: bookingId,
      payload: { bookingId, restartedBy: actor.userId, reason },
    });
  });

  await recordAuditLog(db, {
    actorUserId: actor.userId,
    action: 'dispatch.search.restarted',
    entityType: 'Booking',
    entityId: bookingId,
    beforeState: { status: BookingStatus.EXPIRED },
    afterState: { status: BookingStatus.SEARCHING_DRIVER, reason },
  });

  realtime.publishBookingUpdate(bookingId, 'dispatch.search.restarted', { bookingId });

  try {
    await findAndOfferNextDriver(bookingId, db);
  } catch {
    // Matching continues asynchronously via the worker/next poll; never fail the restart on this.
  }

  const detail = await getDispatchBookingDetail(bookingId, db);
  if (!detail) {
    throw new BookingNotFoundError(bookingId);
  }
  return detail;
}

export interface ForceAssignDriverInput {
  bookingId: string;
  driverProfileId: string;
  actor: AuthenticatedPrincipal;
  reason: string;
  /** Requires DISPATCH_ASSIGNMENT_FORCE_ELIGIBILITY_BYPASS; never implied by DISPATCH_ASSIGNMENT_FORCE alone. */
  bypassEligibility?: boolean;
}

const FORCE_ASSIGNABLE_STATUSES: BookingStatus[] = [
  BookingStatus.SEARCHING_DRIVER,
  BookingStatus.DRIVER_ASSIGNED,
];

/**
 * Operator-initiated direct assignment: skips the normal offer/accept flow
 * and assigns a specific driver immediately. Always requires the driver to
 * be AVAILABLE right now (double-booking a driver onto two simultaneous
 * trips is never permitted, with no override). Eligibility (approval,
 * verified documents, etc.) is enforced by default; bypassing it requires
 * the separate, stronger DISPATCH_ASSIGNMENT_FORCE_ELIGIBILITY_BYPASS
 * permission and is recorded as a high-severity audit event.
 */
export async function forceAssignDriver(
  input: ForceAssignDriverInput,
  db: Db = prisma,
): Promise<DispatchBookingDetail> {
  const { bookingId, driverProfileId, actor, reason, bypassEligibility } = input;
  requirePermission(actor, PERMISSIONS.DISPATCH_ASSIGNMENT_FORCE);

  const eligibility = await evaluateDriverEligibility(driverProfileId, db);
  let eligibilityBypassed = false;
  if (!eligibility.isEligible) {
    if (!bypassEligibility) {
      throw new DriverNotEligibleForDispatchError(driverProfileId, eligibility.reasons);
    }
    requirePermission(actor, PERMISSIONS.DISPATCH_ASSIGNMENT_FORCE_ELIGIBILITY_BYPASS);
    eligibilityBypassed = true;
  }

  const targetDriver = await db.driverProfile.findUnique({ where: { id: driverProfileId } });
  if (!targetDriver) {
    throw new DriverProfileNotFoundError(driverProfileId);
  }
  if (targetDriver.availabilityStatus !== DriverAvailabilityStatus.AVAILABLE) {
    throw new DriverNotAvailableForDispatchError(driverProfileId, targetDriver.availabilityStatus);
  }

  const { previousDriverId } = await db.$transaction(async (tx) => {
    const booking = await tx.booking.findUnique({ where: { id: bookingId } });
    if (!booking) {
      throw new BookingNotFoundError(bookingId);
    }
    if (!FORCE_ASSIGNABLE_STATUSES.includes(booking.status)) {
      throw new DispatchInvalidBookingStateError(
        bookingId,
        booking.status,
        FORCE_ASSIGNABLE_STATUSES,
      );
    }
    validateBookingStatusTransition(booking.status, BookingStatus.DRIVER_ASSIGNED);

    const previousDriverProfileId = booking.driverProfileId;
    const now = new Date();

    if (previousDriverProfileId) {
      await tx.driverProfile.update({
        where: { id: previousDriverProfileId },
        data: { availabilityStatus: DriverAvailabilityStatus.AVAILABLE },
      });
    }

    await tx.bookingAssignmentAttempt.updateMany({
      where: { bookingId, status: AssignmentAttemptStatus.PENDING },
      data: { status: AssignmentAttemptStatus.CANCELLED },
    });

    const attemptCount = await tx.bookingAssignmentAttempt.count({ where: { bookingId } });
    await tx.bookingAssignmentAttempt.create({
      data: {
        bookingId,
        driverProfileId,
        attemptNumber: attemptCount + 1,
        status: AssignmentAttemptStatus.ACCEPTED,
        offeredAt: now,
        respondedAt: now,
        expiresAt: now,
      },
    });

    await tx.booking.update({
      where: { id: bookingId },
      data: { status: BookingStatus.DRIVER_ASSIGNED, driverProfileId, assignedAt: now },
    });

    await tx.driverProfile.update({
      where: { id: driverProfileId },
      data: { availabilityStatus: DriverAvailabilityStatus.BUSY },
    });

    await tx.bookingLog.create({
      data: {
        bookingId,
        actorUserId: actor.userId,
        fromStatus: booking.status,
        toStatus: BookingStatus.DRIVER_ASSIGNED,
        action: eligibilityBypassed
          ? 'dispatch.driver.force_assigned_eligibility_bypassed'
          : 'dispatch.driver.force_assigned',
        reason,
      },
    });

    await insertOutboxEvent(tx, {
      eventType: 'dispatch.driver.force_assigned',
      aggregateType: 'Booking',
      aggregateId: bookingId,
      payload: {
        bookingId,
        driverProfileId,
        previousDriverProfileId,
        forcedBy: actor.userId,
        reason,
        eligibilityBypassed,
      },
    });

    return { previousDriverId: previousDriverProfileId };
  });

  await removeDriverFromLiveIndex(driverProfileId, db);
  if (previousDriverId) {
    const previousEligibility = await evaluateDriverEligibility(previousDriverId, db);
    if (previousEligibility.isEligible) {
      await addDriverToLiveIndex(previousDriverId, db);
    }
  }

  await recordAuditLog(db, {
    actorUserId: actor.userId,
    action: eligibilityBypassed
      ? 'dispatch.driver.force_assigned_eligibility_bypassed'
      : 'dispatch.driver.force_assigned',
    entityType: 'Booking',
    entityId: bookingId,
    beforeState: { driverProfileId: previousDriverId },
    afterState: {
      driverProfileId,
      reason,
      eligibilityBypassed,
      eligibilityReasons: eligibility.reasons,
    },
  });

  realtime.publishBookingUpdate(bookingId, 'dispatch.driver.force_assigned', {
    bookingId,
    driverProfileId,
  });

  const detail = await getDispatchBookingDetail(bookingId, db);
  if (!detail) {
    throw new BookingNotFoundError(bookingId);
  }
  return detail;
}

export interface CancelBookingByOperatorInput {
  bookingId: string;
  actor: AuthenticatedPrincipal;
  reason: string;
}

const OPERATOR_CANCELLABLE_STATUSES: BookingStatus[] = [
  BookingStatus.DRAFT,
  BookingStatus.SEARCHING_DRIVER,
  BookingStatus.DRIVER_ASSIGNED,
  BookingStatus.DRIVER_EN_ROUTE,
  BookingStatus.DRIVER_ARRIVED,
];

/**
 * Operator-initiated cancellation: cancels an active, non-terminal booking,
 * releases any assigned driver (restoring their availability and live location index),
 * cancels pending assignment attempts, logs the action, and emits outbox + audit logs.
 */
export async function cancelBookingByOperator(
  input: CancelBookingByOperatorInput,
  db: Db = prisma,
): Promise<DispatchBookingDetail> {
  const { bookingId, actor, reason } = input;
  requirePermission(actor, PERMISSIONS.BOOKINGS_CANCEL);

  const { previousDriverId } = await db.$transaction(async (tx) => {
    const booking = await tx.booking.findUnique({ where: { id: bookingId } });
    if (!booking) {
      throw new BookingNotFoundError(bookingId);
    }
    if (!OPERATOR_CANCELLABLE_STATUSES.includes(booking.status)) {
      throw new DispatchInvalidBookingStateError(
        bookingId,
        booking.status,
        OPERATOR_CANCELLABLE_STATUSES,
      );
    }
    validateBookingStatusTransition(booking.status, BookingStatus.CANCELLED);

    const previousDriverProfileId = booking.driverProfileId;

    await tx.bookingAssignmentAttempt.updateMany({
      where: { bookingId, status: AssignmentAttemptStatus.PENDING },
      data: { status: AssignmentAttemptStatus.CANCELLED },
    });

    if (previousDriverProfileId) {
      await tx.driverProfile.update({
        where: { id: previousDriverProfileId },
        data: { availabilityStatus: DriverAvailabilityStatus.AVAILABLE },
      });
    }

    await tx.booking.update({
      where: { id: bookingId },
      data: {
        status: BookingStatus.CANCELLED,
        driverProfileId: null,
      },
    });

    await tx.bookingLog.create({
      data: {
        bookingId,
        actorUserId: actor.userId,
        fromStatus: booking.status,
        toStatus: BookingStatus.CANCELLED,
        action: 'dispatch.booking.cancelled',
        reason,
      },
    });

    await insertOutboxEvent(tx, {
      eventType: 'dispatch.booking.cancelled',
      aggregateType: 'Booking',
      aggregateId: bookingId,
      payload: {
        bookingId,
        cancelledBy: actor.userId,
        previousDriverProfileId,
        reason,
      },
    });

    return { previousDriverId: previousDriverProfileId };
  });

  if (previousDriverId) {
    const eligibility = await evaluateDriverEligibility(previousDriverId, db);
    if (eligibility.isEligible) {
      await addDriverToLiveIndex(previousDriverId, db);
    }
  }

  await recordAuditLog(db, {
    actorUserId: actor.userId,
    action: 'dispatch.booking.cancelled',
    entityType: 'Booking',
    entityId: bookingId,
    beforeState: { driverProfileId: previousDriverId },
    afterState: { status: BookingStatus.CANCELLED, reason },
  });

  realtime.publishBookingUpdate(bookingId, 'dispatch.booking.cancelled', {
    bookingId,
    reason,
  });

  const detail = await getDispatchBookingDetail(bookingId, db);
  if (!detail) {
    throw new BookingNotFoundError(bookingId);
  }
  return detail;
}
