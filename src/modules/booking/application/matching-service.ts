import 'server-only';
import { prisma, type Db } from '@/shared/database/prisma';
import {
  BookingStatus,
  AssignmentAttemptStatus,
  DriverApprovalStatus,
  DriverAvailabilityStatus,
} from '@prisma/client';
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
import { isDriverHireBooking, isRateSelectableHireBooking } from '../domain/booking-policy';
import { findConflictingDriverIds } from './driver-hire-availability-service';

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

  // 1. Check Overall Search Expiration (Server-authoritative 3-minute limit)
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
  // 30s was too tight against real-world latency: the driver app polls for
  // new offers every 5s, plus push-notification delivery time, plus the
  // time it actually takes a person to look at their phone and decide —
  // that easily eats most of a 30s window before the driver has even seen
  // the offer, leaving Accept/Reject looking permanently disabled by the
  // time they do. 120s (2 minutes) gives a realistic margin without
  // materially slowing dispatch to the next candidate if a driver
  // genuinely doesn't respond — this default only applies when no
  // SystemConfiguration row exists yet; an existing seeded row (see
  // prisma/seed.ts) still wins until it's updated via
  // POST /api/admin/configuration or a fresh seed run.
  const responseTimeoutSeconds = await getInteger(
    'booking.matching.driver_response_timeout_seconds',
    120,
    db,
  );

  // Transactionally creates a PENDING assignment attempt offering the given
  // driver, and records the matching outbox event + audit log. Shared by
  // both the normal geo-proximity path below and the DAILY/WEEKLY/MONTHLY
  // no-fallback single-driver path.
  const createOffer = async (
    driverProfileId: string,
    offerMessage: string,
  ): Promise<MatchingResult> => {
    const offerExpiresAt = new Date(now.getTime() + responseTimeoutSeconds * 1000);
    const nextAttemptNumber = booking.assignmentAttempts.length + 1;

    // The notification handler for 'booking.driver.offered' needs the
    // driver's USER id, not their DriverProfile id — without this lookup,
    // payload.driverUserId is always undefined and the driver is never
    // actually notified of the offer (a bug that silently affected every
    // booking type, not just this one).
    const offeredDriverProfile = await db.driverProfile.findUnique({
      where: { id: driverProfileId },
      select: { userId: true },
    });

    const attempt = await db.$transaction(async (tx) => {
      const createdAttempt = await tx.bookingAssignmentAttempt.create({
        data: {
          bookingId: booking.id,
          driverProfileId,
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
          driverProfileId,
          driverUserId: offeredDriverProfile?.userId ?? null,
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
        driverProfileId,
        attemptNumber: nextAttemptNumber,
        expiresAt: offerExpiresAt.toISOString(),
      },
    });

    return {
      attemptId: attempt.id,
      status: 'OFFERED',
      message: offerMessage,
    };
  };

  // DAILY/WEEKLY/MONTHLY hires require the customer to have already chosen
  // a specific driver at that driver's own rate (enforced at booking
  // creation — see booking-service.ts / driver-hire-availability-service.ts).
  // By design there is no fallback to a different driver here: reassigning
  // to someone else would silently change the price the customer agreed to.
  // If the chosen driver is no longer available, the search expires outright
  // rather than widening into the normal geo-proximity pool below.
  if (isRateSelectableHireBooking(booking.bookingType)) {
    const chosenDriverId = booking.preferredDriverProfileId;
    let isStillAvailable = false;

    if (chosenDriverId && !attemptedDriverIds.has(chosenDriverId)) {
      const driverProfile = await db.driverProfile.findUnique({ where: { id: chosenDriverId } });
      isStillAvailable =
        !!driverProfile &&
        driverProfile.approvalStatus === DriverApprovalStatus.APPROVED &&
        driverProfile.availabilityStatus === DriverAvailabilityStatus.AVAILABLE;

      if (isStillAvailable && booking.hireStartAt && booking.hireEndAt) {
        const conflicting = await findConflictingDriverIds(
          [chosenDriverId],
          booking.hireStartAt,
          booking.hireEndAt,
          db,
        );
        isStillAvailable = !conflicting.has(chosenDriverId);
      }

      if (isStillAvailable && booking.vehicleCategoryId) {
        const cap = await db.driverVehicleCapability.findUnique({
          where: {
            driverProfileId_vehicleCategoryId: {
              driverProfileId: chosenDriverId,
              vehicleCategoryId: booking.vehicleCategoryId,
            },
          },
        });
        if (!cap) {
          isStillAvailable = false;
        }
      }
    }

    if (!chosenDriverId || !isStillAvailable) {
      await cancelBookingNoDriverFound(booking.id, db);
      return {
        attemptId: null,
        status: 'NO_DRIVERS_FOUND',
        message:
          'The selected driver is no longer available or does not possess the requested vehicle capability; this booking type does not fall back to another driver.',
      };
    }

    return createOffer(
      chosenDriverId,
      "Assignment offer created for the customer's selected driver.",
    );
  }

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

  // Filter out drivers lacking requested vehicle category capability
  if (booking.vehicleCategoryId && unattempted.length > 0) {
    const candidateIds = unattempted.map((c) => c.driverId);
    const capable = await db.driverVehicleCapability.findMany({
      where: {
        driverProfileId: { in: candidateIds },
        vehicleCategoryId: booking.vehicleCategoryId,
        vehicleCategory: { isActive: true },
      },
      select: { driverProfileId: true },
    });
    const capableSet = new Set(capable.map((c) => c.driverProfileId));
    unattempted = unattempted.filter((c) => capableSet.has(c.driverId));
  }

  // For duration-based driver hire (HOURLY/FULL_DAY/MULTI_DAY — the hire
  // types that still use the geo-proximity pool rather than the required
  // single-driver path above), also exclude any candidate already committed
  // to another hire whose window overlaps this booking's [hireStartAt,
  // hireEndAt] — a driver assigned 10:00-18:00 today must never be offered a
  // second hire for 12:00-14:00. This is additive: it narrows the candidate
  // pool further, it never widens isDriverDispatchEligible's existing
  // (broader) active-booking gate, so no previously-blocked driver becomes
  // eligible here.
  if (isDriverHireBooking(booking.bookingType) && booking.hireStartAt && booking.hireEndAt) {
    const candidateIds = unattempted.map((c) => c.driverId);
    const conflictingDriverIds = await findConflictingDriverIds(
      candidateIds,
      booking.hireStartAt,
      booking.hireEndAt,
      db,
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

  // 6. Intelligent Candidate Ranking — fetch actual telemetry for accuracy & capturedAt
  const unattemptedIds = unattempted.map((c) => c.driverId);
  const locationTelemetries = db.driverCurrentLocation?.findMany
    ? await db.driverCurrentLocation.findMany({
        where: { driverProfileId: { in: unattemptedIds } },
        select: { driverProfileId: true, accuracy: true, capturedAt: true },
      })
    : [];
  const telemetryMap = new Map<string, { accuracy: number | null; capturedAt: Date }>();
  for (const t of locationTelemetries) {
    telemetryMap.set(t.driverProfileId, { accuracy: t.accuracy, capturedAt: t.capturedAt });
  }

  const ranked = await rankCandidateDrivers(
    unattempted.map((c) => {
      const tel = telemetryMap.get(c.driverId);
      return {
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
        accuracy: tel?.accuracy ?? null,
        capturedAt: tel?.capturedAt ?? now,
        availabilityStatus: DriverAvailabilityStatus.AVAILABLE,
      };
    }),
    {
      pickupLatitude: booking.pickupLatitude,
      pickupLongitude: booking.pickupLongitude,
      preferredDriverProfileId: booking.preferredDriverProfileId,
      customerId: booking.customerId,
      bookingType: booking.bookingType,
      requestedVehicleCategory: booking.vehicleCategoryId,
    },
    db,
  );

  // Authoritative selection: prioritize explicitly requested preferred driver if in unattempted pool, else top-ranked candidate
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

  return createOffer(
    targetDriver.driverId,
    `Assignment offer #${booking.assignmentAttempts.length + 1} created for driver ${targetDriver.displayName}.`,
  );
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
