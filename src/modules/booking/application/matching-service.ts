import 'server-only';
import { prisma, type Db } from '@/shared/database/prisma';
import { BookingStatus, AssignmentAttemptStatus, DriverAvailabilityStatus } from '@prisma/client';
import { getInteger } from '@/shared/config/configuration-service';
import { findNearbyDrivers } from '@/modules/location/application/nearby-driver-service';
import { validateBookingStatusTransition } from '../domain/booking-state-machine';
import { insertOutboxEvent } from '@/shared/outbox/outbox-service';
import { recordAuditLog } from '@/shared/audit/audit-service';
import { BookingNotFoundError } from '../domain/errors';
import { rankCandidateDrivers } from '@/modules/dispatch/application/candidate-ranking-service';
import {
  cancelBookingNoDriverFound,
  SEARCH_DEADLINE_SECONDS,
} from '@/modules/dispatch/application/dispatch-search-service';
import { isDriverHireBooking } from '../domain/booking-policy';

export interface MatchingResult {
  attemptId: string | null;
  status: 'OFFERED' | 'NO_DRIVERS_FOUND' | 'MAX_ATTEMPTS_REACHED' | 'SEARCH_EXPIRED';
  message: string;
}

/**
 * Searches for nearby eligible candidates and creates a PENDING assignment attempt for the next candidate driver.
 * Expands search radius if initial attempt yields no new candidates.
 */
export async function findAndOfferNextDriver(
  bookingId: string,
  db: Db = prisma,
): Promise<MatchingResult> {
  const booking = await db.booking.findUnique({
    where: { id: bookingId },
    include: { assignmentAttempts: true },
  });

  if (!booking) {
    throw new BookingNotFoundError(bookingId);
  }

  if (booking.status !== BookingStatus.SEARCHING_DRIVER) {
    return {
      attemptId: null,
      status: 'SEARCH_EXPIRED',
      message: `Booking is in ${booking.status} state; matching stopped.`,
    };
  }

  const now = new Date();

  // 1. Check Overall Search Expiration (Server-authoritative 2-minute limit)
  const searchTimeoutSeconds = await getInteger(
    'booking.matching.search_timeout_seconds',
    SEARCH_DEADLINE_SECONDS,
    db,
  );
  const searchStarted = booking.searchStartedAt || booking.requestedAt;
  const effectiveExpiresAt =
    booking.expiresAt || new Date(searchStarted.getTime() + searchTimeoutSeconds * 1000);
  if (now > effectiveExpiresAt) {
    await cancelBookingNoDriverFound(booking.id, db);
    return {
      attemptId: null,
      status: 'SEARCH_EXPIRED',
      message: 'Booking search duration expired without driver assignment.',
    };
  }

  // 2. Check Candidate Attempts Limit
  const maxAttempts = await getInteger('booking.matching.maximum_candidate_attempts', 5, db);
  if (booking.assignmentAttempts.length >= maxAttempts) {
    await expireBookingSearch(
      booking.id,
      `Maximum candidate attempts (${maxAttempts}) reached`,
      db,
    );
    return {
      attemptId: null,
      status: 'MAX_ATTEMPTS_REACHED',
      message: `Maximum candidate attempts (${maxAttempts}) reached.`,
    };
  }

  // 3. Collect previously offered drivers
  const attemptedDriverIds = new Set(booking.assignmentAttempts.map((a) => a.driverProfileId));

  // 4. Retrieve configuration parameters for radius expansion
  const initialRadius = await getInteger('booking.matching.initial_radius_meters', 5000, db);
  const radiusIncrement = await getInteger('booking.matching.radius_increment_meters', 2500, db);
  const maxRadius = await getInteger('booking.matching.maximum_radius_meters', 20000, db);
  const responseTimeoutSeconds = await getInteger(
    'booking.matching.driver_response_timeout_seconds',
    30,
    db,
  );

  let currentRadius = initialRadius + booking.assignmentAttempts.length * radiusIncrement;
  currentRadius = Math.min(currentRadius, maxRadius);

  // 5. Discover nearby candidates using Phase 5 Location infrastructure
  const candidates = await findNearbyDrivers(
    {
      latitude: booking.pickupLatitude,
      longitude: booking.pickupLongitude,
      radiusMeters: currentRadius,
    },
    db,
  );

  // Filter out drivers already attempted
  let unattempted = candidates.filter((c) => !attemptedDriverIds.has(c.driverId));

  // For duration-based driver hire (HOURLY/DAILY/WEEKLY/MONTHLY/etc.), also
  // exclude any candidate already committed to another hire whose window
  // overlaps this booking's [hireStartAt, hireEndAt] — a driver assigned
  // 10:00-18:00 today must never be offered a second hire for 12:00-14:00.
  // This is additive: it narrows the candidate pool further, it never
  // widens isDriverDispatchEligible's existing (broader) active-booking
  // gate, so no previously-blocked driver becomes eligible here.
  if (isDriverHireBooking(booking.bookingType) && booking.hireStartAt && booking.hireEndAt) {
    const candidateIds = unattempted.map((c) => c.driverId);
    const conflicts = await db.booking.findMany({
      where: {
        driverProfileId: { in: candidateIds },
        status: {
          in: [
            BookingStatus.DRIVER_ASSIGNED,
            BookingStatus.DRIVER_EN_ROUTE,
            BookingStatus.DRIVER_ARRIVED,
            BookingStatus.TRIP_IN_PROGRESS,
          ],
        },
        hireStartAt: { lt: booking.hireEndAt },
        hireEndAt: { gt: booking.hireStartAt },
      },
      select: { driverProfileId: true },
    });
    const conflictingDriverIds = new Set(
      conflicts.map((c) => c.driverProfileId).filter((id): id is string => id !== null),
    );
    unattempted = unattempted.filter((c) => !conflictingDriverIds.has(c.driverId));
  }

  if (unattempted.length === 0) {
    // If maximum radius reached and no candidate found, trigger no-driver check
    if (currentRadius >= maxRadius) {
      await cancelBookingNoDriverFound(booking.id, db);
      return {
        attemptId: null,
        status: 'NO_DRIVERS_FOUND',
        message: 'No available drivers found within search radius.',
      };
    }

    return {
      attemptId: null,
      status: 'NO_DRIVERS_FOUND',
      message: 'No unattempted drivers found in current radius.',
    };
  }

  // 6. Intelligent Candidate Ranking
  const ranked = await rankCandidateDrivers(
    unattempted.map((c) => ({
      driverProfileId: c.driverId,
      displayName: c.displayName,
      latitude:
        (c as { location?: { latitude: number }; latitude?: number }).location?.latitude ??
        (c as { latitude?: number }).latitude ??
        booking.pickupLatitude,
      longitude:
        (c as { location?: { longitude: number }; longitude?: number }).location?.longitude ??
        (c as { longitude?: number }).longitude ??
        booking.pickupLongitude,
      accuracy: null,
      capturedAt: now,
      availabilityStatus: DriverAvailabilityStatus.AVAILABLE,
    })),
    {
      pickupLatitude: booking.pickupLatitude,
      pickupLongitude: booking.pickupLongitude,
      preferredDriverProfileId: booking.preferredDriverProfileId,
      customerId: booking.customerId,
    },
    db,
  );

  let targetDriver = null;
  if (
    booking.preferredDriverProfileId &&
    !attemptedDriverIds.has(booking.preferredDriverProfileId)
  ) {
    const preferredCandidate = unattempted.find(
      (c) => c.driverId === booking.preferredDriverProfileId,
    );
    if (preferredCandidate) {
      targetDriver = preferredCandidate;
    }
  }

  if (!targetDriver) {
    const topRankedCandidate = ranked.length > 0 ? ranked[0] : null;
    targetDriver = topRankedCandidate
      ? unattempted.find((c) => c.driverId === topRankedCandidate.driverProfileId) || unattempted[0]
      : unattempted[0];
  }

  const offerExpiresAt = new Date(now.getTime() + responseTimeoutSeconds * 1000);
  const nextAttemptNumber = booking.assignmentAttempts.length + 1;

  // Transactionally create assignment attempt
  const attempt = await db.$transaction(async (tx) => {
    const createdAttempt = await tx.bookingAssignmentAttempt.create({
      data: {
        bookingId: booking.id,
        driverProfileId: targetDriver.driverId,
        attemptNumber: nextAttemptNumber,
        status: AssignmentAttemptStatus.PENDING,
        offeredAt: now,
        expiresAt: offerExpiresAt,
      },
    });

    await insertOutboxEvent(tx, {
      eventType: 'booking.driver.offered',
      aggregateType: 'BookingAssignmentAttempt',
      aggregateId: createdAttempt.id,
      payload: {
        bookingId: booking.id,
        attemptId: createdAttempt.id,
        driverProfileId: targetDriver.driverId,
        attemptNumber: nextAttemptNumber,
        offeredAt: now.toISOString(),
        expiresAt: offerExpiresAt.toISOString(),
      },
    });

    return createdAttempt;
  });

  await recordAuditLog(db, {
    actorUserId: null,
    action: 'booking.driver.offered',
    entityType: 'BookingAssignmentAttempt',
    entityId: attempt.id,
    afterState: {
      bookingId: booking.id,
      driverProfileId: targetDriver.driverId,
      attemptNumber: nextAttemptNumber,
      expiresAt: offerExpiresAt.toISOString(),
    },
  });

  return {
    attemptId: attempt.id,
    status: 'OFFERED',
    message: `Assignment offer #${nextAttemptNumber} created for driver ${targetDriver.displayName}.`,
  };
}

/**
 * Transactionally expires a booking search.
 */
export async function expireBookingSearch(
  bookingId: string,
  reason: string,
  db: Db = prisma,
): Promise<void> {
  const booking = await db.booking.findUnique({ where: { id: bookingId } });
  if (!booking) return;

  if (booking.status !== BookingStatus.SEARCHING_DRIVER) return;

  validateBookingStatusTransition(booking.status, BookingStatus.EXPIRED);

  await db.$transaction(async (tx) => {
    await tx.booking.update({
      where: { id: booking.id },
      data: {
        status: BookingStatus.EXPIRED,
      },
    });

    await tx.bookingLog.create({
      data: {
        bookingId: booking.id,
        fromStatus: booking.status,
        toStatus: BookingStatus.EXPIRED,
        action: 'booking.search.expired',
        reason,
      },
    });

    // Mark any PENDING assignment attempts as EXPIRED
    await tx.bookingAssignmentAttempt.updateMany({
      where: { bookingId: booking.id, status: AssignmentAttemptStatus.PENDING },
      data: { status: AssignmentAttemptStatus.EXPIRED },
    });

    await insertOutboxEvent(tx, {
      eventType: 'booking.search.expired',
      aggregateType: 'Booking',
      aggregateId: booking.id,
      payload: { bookingId: booking.id, expiredAt: new Date().toISOString(), reason },
    });
  });

  await recordAuditLog(db, {
    actorUserId: null,
    action: 'booking.search.expired',
    entityType: 'Booking',
    entityId: bookingId,
    beforeState: { status: booking.status },
    afterState: { status: BookingStatus.EXPIRED, reason },
  });
}
