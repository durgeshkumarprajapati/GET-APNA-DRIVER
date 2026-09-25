import 'server-only';
import { BookingStatus, AssignmentAttemptStatus } from '@prisma/client';
import { prisma, type Db } from '@/shared/database/prisma';
import { insertOutboxEvent } from '@/shared/outbox/outbox-service';
import { recordAuditLog } from '@/shared/audit/audit-service';
import { validateBookingStatusTransition } from '@/modules/booking/domain/booking-state-machine';
import { DispatchSearchState } from '../domain/candidate-ranking-types';

export const SEARCH_DEADLINE_SECONDS = 180; // Server-authoritative 3-minute search deadline
export const CANCELLATION_REASON_NO_DRIVER = 'NO_ACTIVE_DRIVER_NEARBY';
export const CANCELLATION_REASON_DRIVER_REJECTED = 'Booking rejected by driver';
export const CUSTOMER_CANCELLATION_TEXT = 'No active driver found near you.';

/**
 * Returns the dispatch search state and deadline for a booking.
 */
export async function getDispatchSearchState(
  bookingId: string,
  db: Db = prisma,
): Promise<DispatchSearchState | null> {
  const booking = await db.booking.findUnique({
    where: { id: bookingId },
    select: {
      id: true,
      status: true,
      searchStartedAt: true,
      createdAt: true,
      expiresAt: true,
      cancelledBy: true,
      cancellationReason: true,
      customerId: true,
      assignmentAttempts: {
        select: {
          id: true,
          status: true,
          expiresAt: true,
        },
      },
    },
  });

  if (!booking) return null;

  const now = new Date();
  const searchStartedAt = booking.searchStartedAt || booking.createdAt;
  const searchDeadlineAt =
    booking.expiresAt || new Date(searchStartedAt.getTime() + SEARCH_DEADLINE_SECONDS * 1000);
  const remainingSeconds = Math.max(
    0,
    Math.ceil((searchDeadlineAt.getTime() - now.getTime()) / 1000),
  );
  const hasExpired = now >= searchDeadlineAt;

  const activeOffersCount = booking.assignmentAttempts
    ? booking.assignmentAttempts.filter((a) => a.status === AssignmentAttemptStatus.PENDING).length
    : 0;

  const isDriverRejected =
    booking.status === 'CANCELLED' &&
    (booking.cancellationReason?.toLowerCase().includes('rejected') ||
      (booking.cancelledBy !== null && booking.cancelledBy !== booking.customerId));

  return {
    bookingId: booking.id,
    status: booking.status,
    searchStartedAt,
    searchDeadlineAt,
    remainingSeconds,
    candidatePoolSize: activeOffersCount,
    rankedCandidatesCount: booking.assignmentAttempts?.length || 0,
    hasExpired,
    cancelledBy: booking.cancelledBy || null,
    cancellationReason: booking.cancellationReason || null,
    isDriverRejected,
  };
}

/**
 * Executes automatic server-authoritative 2-minute search deadline cancellation.
 * Only cancels if booking is still in SEARCHING_DRIVER state and unassigned.
 * Auto-detects if assignment attempt was REJECTED by driver and sets reason/cancelledBy accordingly.
 */
export async function cancelBookingNoDriverFound(
  bookingId: string,
  db: Db = prisma,
): Promise<{ cancelled: boolean; reason: string }> {
  const booking = await db.booking.findUnique({
    where: { id: bookingId },
    include: { assignmentAttempts: true },
  });

  if (!booking) {
    return { cancelled: false, reason: 'Booking not found' };
  }

  // If already assigned or not searching, do NOT cancel
  if (booking.status !== BookingStatus.SEARCHING_DRIVER) {
    return { cancelled: false, reason: `Booking is in ${booking.status} state` };
  }

  // Check if there is an assignment attempt currently PENDING or ACCEPTED
  const hasActiveAttempt = booking.assignmentAttempts.some(
    (a) =>
      a.status === AssignmentAttemptStatus.PENDING || a.status === AssignmentAttemptStatus.ACCEPTED,
  );

  if (hasActiveAttempt && booking.driverProfileId) {
    return { cancelled: false, reason: 'Driver assigned or assignment pending' };
  }

  const now = new Date();

  validateBookingStatusTransition(booking.status, BookingStatus.CANCELLED);

  // Check if any assignment attempt was REJECTED by driver
  const rejectedAttempts = booking.assignmentAttempts.filter(
    (a) => a.status === AssignmentAttemptStatus.REJECTED,
  );

  let cancellationReason = CANCELLATION_REASON_NO_DRIVER;
  let cancellationText = CUSTOMER_CANCELLATION_TEXT;
  let cancelledByUserId: string | null = null;
  let actionName = 'booking.cancelled.no_driver';
  let eventType = 'booking.no_driver_found';

  if (rejectedAttempts.length > 0) {
    const lastRejected = rejectedAttempts[rejectedAttempts.length - 1];
    cancellationReason = lastRejected.rejectionReason || CANCELLATION_REASON_DRIVER_REJECTED;
    cancellationText = CANCELLATION_REASON_DRIVER_REJECTED;
    actionName = 'booking.cancelled.driver_rejected';
    eventType = 'booking.driver_rejected';

    const driverProfile = await db.driverProfile.findUnique({
      where: { id: lastRejected.driverProfileId },
      select: { userId: true },
    });
    if (driverProfile?.userId) {
      cancelledByUserId = driverProfile.userId;
    }
  }

  await db.$transaction(async (tx) => {
    // 1. Authoritative status update to CANCELLED
    await tx.booking.update({
      where: { id: booking.id },
      data: {
        status: BookingStatus.CANCELLED,
        cancelledAt: now,
        cancelledBy: cancelledByUserId,
        cancellationReason,
      },
    });

    // 2. Mark any remaining PENDING assignment attempts as EXPIRED/CANCELLED
    await tx.bookingAssignmentAttempt.updateMany({
      where: { bookingId: booking.id, status: AssignmentAttemptStatus.PENDING },
      data: { status: AssignmentAttemptStatus.CANCELLED },
    });

    // 3. Log booking status transition
    await tx.bookingLog.create({
      data: {
        bookingId: booking.id,
        fromStatus: booking.status,
        toStatus: BookingStatus.CANCELLED,
        action: actionName,
        reason: cancellationText,
      },
    });

    // 4. Emit outbox event
    await insertOutboxEvent(tx, {
      eventType,
      aggregateType: 'Booking',
      aggregateId: booking.id,
      payload: {
        bookingId: booking.id,
        customerId: booking.customerId,
        reason: cancellationReason,
        message: cancellationText,
        cancelledAt: now.toISOString(),
        cancelledBy: cancelledByUserId,
      },
    });
  });

  await recordAuditLog(db, {
    actorUserId: cancelledByUserId,
    action: actionName,
    entityType: 'Booking',
    entityId: bookingId,
    beforeState: { status: booking.status },
    afterState: {
      status: BookingStatus.CANCELLED,
      cancellationReason,
      cancelledBy: cancelledByUserId,
    },
  });

  return { cancelled: true, reason: cancellationReason };
}

/**
 * Triggers active search re-evaluation when a driver comes online / AVAILABLE.
 * Identifies searching bookings nearby and attempts candidate ranking & offering.
 */
export async function handleDriverOnlinePresence(
  driverProfileId: string,
  db: Db = prisma,
): Promise<{ reevaluatedCount: number }> {
  // Fetch driver profile current location
  const currentLocation = await db.driverCurrentLocation.findUnique({
    where: { driverProfileId },
  });

  if (!currentLocation) {
    return { reevaluatedCount: 0 };
  }

  // Find searching bookings within 20km search radius
  const maxSearchRadius = 20000;
  const searchingBookings = await db.booking.findMany({
    where: {
      status: BookingStatus.SEARCHING_DRIVER,
    },
    take: 50,
  });

  let count = 0;

  for (const booking of searchingBookings) {
    // Check if booking search is within radius
    const distanceMeters = Math.hypot(
      (booking.pickupLatitude - currentLocation.latitude) * 111000,
      (booking.pickupLongitude - currentLocation.longitude) * 111000,
    );

    if (distanceMeters <= maxSearchRadius) {
      count++;
      // Emit outbox event to trigger candidate re-evaluation
      await insertOutboxEvent(db, {
        eventType: 'dispatch.active_search.reevaluate',
        aggregateType: 'Booking',
        aggregateId: booking.id,
        payload: {
          bookingId: booking.id,
          driverProfileId,
          triggeredAt: new Date().toISOString(),
        },
      });
    }
  }

  return { reevaluatedCount: count };
}
