import 'server-only';
import { BookingStatus, AssignmentAttemptStatus, DriverAvailabilityStatus } from '@prisma/client';
import { prisma, type Db } from '@/shared/database/prisma';
import { getInteger, getString } from '@/shared/config/configuration-service';
import { rankCandidateDrivers } from './candidate-ranking-service';
import { findNearbyDrivers } from '@/modules/location/application/nearby-driver-service';
import { isDriverHireBooking } from '@/modules/booking/domain/booking-policy';
import { insertOutboxEvent } from '@/shared/outbox/outbox-service';
import { recordAuditLog } from '@/shared/audit/audit-service';
import { cancelBookingNoDriverFound, SEARCH_DEADLINE_SECONDS } from './dispatch-search-service';
import { BookingNotFoundError } from '@/modules/booking/domain/errors';

export type DispatchOfferStrategy = 'SEQUENTIAL' | 'PARALLEL';

export interface DispatchOrchestrationOptions {
  strategy?: DispatchOfferStrategy;
  batchSize?: number;
  timeoutSeconds?: number;
}

export interface DispatchOfferResult {
  bookingId: string;
  strategy: DispatchOfferStrategy;
  offeredAttemptsCount: number;
  attemptIds: string[];
  status: 'OFFERED' | 'NO_DRIVERS_FOUND' | 'MAX_ATTEMPTS_REACHED' | 'SEARCH_EXPIRED';
  message: string;
}

/**
 * Production-grade offer orchestration engine.
 * Integrates Phase 59 candidate ranking into configurable offer strategies (SEQUENTIAL vs PARALLEL).
 * Preserves database transactional authority and 120-second search deadline.
 */
export async function orchestrateDispatchOffers(
  bookingId: string,
  options: DispatchOrchestrationOptions = {},
  db: Db = prisma,
): Promise<DispatchOfferResult> {
  const booking = await db.booking.findUnique({
    where: { id: bookingId },
    include: { assignmentAttempts: true },
  });

  if (!booking) {
    throw new BookingNotFoundError(bookingId);
  }

  if (booking.status !== BookingStatus.SEARCHING_DRIVER) {
    return {
      bookingId,
      strategy: 'SEQUENTIAL',
      offeredAttemptsCount: 0,
      attemptIds: [],
      status: 'SEARCH_EXPIRED',
      message: `Booking is in ${booking.status} state; orchestration stopped.`,
    };
  }

  const now = new Date();

  // 1. Check Overall Search Expiration (Server-authoritative 120-second deadline)
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
      bookingId,
      strategy: 'SEQUENTIAL',
      offeredAttemptsCount: 0,
      attemptIds: [],
      status: 'SEARCH_EXPIRED',
      message: 'Booking search duration expired without driver assignment.',
    };
  }

  // 2. Check Candidate Attempts Limit
  const maxAttempts = await getInteger('booking.matching.maximum_candidate_attempts', 5, db);
  if (booking.assignmentAttempts.length >= maxAttempts) {
    return {
      bookingId,
      strategy: 'SEQUENTIAL',
      offeredAttemptsCount: 0,
      attemptIds: [],
      status: 'MAX_ATTEMPTS_REACHED',
      message: `Maximum candidate attempts (${maxAttempts}) reached.`,
    };
  }

  // Collect previously offered drivers
  const attemptedDriverIds = new Set(booking.assignmentAttempts.map((a) => a.driverProfileId));

  // 3. Load Strategy Configuration
  const configuredStrategy = (await getString(
    'dispatch.offer.strategy',
    'SEQUENTIAL',
    db,
  )) as DispatchOfferStrategy;
  const strategy: DispatchOfferStrategy = options.strategy || configuredStrategy || 'SEQUENTIAL';

  const configuredBatchSize = await getInteger('dispatch.offer.batch_size', 1, db);
  const rawBatchSize = options.batchSize || configuredBatchSize || 1;
  // Bounded parallel offer batch size: min 1, max 3 (prevents notification storms/fan-out)
  const batchSize = strategy === 'PARALLEL' ? Math.min(Math.max(1, rawBatchSize), 3) : 1;

  const responseTimeoutSeconds = await getInteger('dispatch.offer.timeout_seconds', 30, db);
  const offerTimeout = options.timeoutSeconds || responseTimeoutSeconds || 30;

  // 4. Radius Calculation & Candidate Discovery
  const initialRadius = await getInteger('booking.matching.initial_radius_meters', 5000, db);
  const radiusIncrement = await getInteger('booking.matching.radius_increment_meters', 2500, db);
  const maxRadius = await getInteger('booking.matching.maximum_radius_meters', 20000, db);

  let currentRadius = initialRadius + booking.assignmentAttempts.length * radiusIncrement;
  currentRadius = Math.min(currentRadius, maxRadius);

  const nearbyCandidates = await findNearbyDrivers(
    {
      latitude: booking.pickupLatitude,
      longitude: booking.pickupLongitude,
      radiusMeters: currentRadius,
    },
    db,
  );

  let unattempted = nearbyCandidates.filter((c) => !attemptedDriverIds.has(c.driverId));

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

  // Filter duration-based driver hire overlaps
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
    if (currentRadius >= maxRadius) {
      await cancelBookingNoDriverFound(booking.id, db);
      return {
        bookingId,
        strategy,
        offeredAttemptsCount: 0,
        attemptIds: [],
        status: 'NO_DRIVERS_FOUND',
        message: 'No available drivers found within search radius.',
      };
    }
    return {
      bookingId,
      strategy,
      offeredAttemptsCount: 0,
      attemptIds: [],
      status: 'NO_DRIVERS_FOUND',
      message: 'No unattempted drivers found in current radius.',
    };
  }

  // 5. Intelligent Candidate Ranking (Phase 59)
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

  const rankedCandidates = await rankCandidateDrivers(
    unattempted.map((c) => {
      const tel = telemetryMap.get(c.driverId);
      return {
        driverProfileId: c.driverId,
        displayName: c.displayName,
        latitude: c.location.latitude,
        longitude: c.location.longitude,
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

  // Determine target drivers to offer (bounded by batchSize)
  const targetCandidates = rankedCandidates.slice(0, batchSize);
  if (targetCandidates.length === 0) {
    return {
      bookingId,
      strategy,
      offeredAttemptsCount: 0,
      attemptIds: [],
      status: 'NO_DRIVERS_FOUND',
      message: 'No eligible candidates in current radius.',
    };
  }

  const offerExpiresAt = new Date(now.getTime() + offerTimeout * 1000);
  const createdAttemptIds: string[] = [];

  // Transactionally create assignment offers
  await db.$transaction(async (tx) => {
    let attemptIndex = booking.assignmentAttempts.length;

    for (const candidate of targetCandidates) {
      attemptIndex++;

      const createdAttempt = await tx.bookingAssignmentAttempt.create({
        data: {
          bookingId: booking.id,
          driverProfileId: candidate.driverProfileId,
          attemptNumber: attemptIndex,
          status: AssignmentAttemptStatus.PENDING,
          offeredAt: now,
          expiresAt: offerExpiresAt,
        },
      });

      createdAttemptIds.push(createdAttempt.id);

      await insertOutboxEvent(tx, {
        eventType: 'booking.driver.offered',
        aggregateType: 'BookingAssignmentAttempt',
        aggregateId: createdAttempt.id,
        payload: {
          bookingId: booking.id,
          attemptId: createdAttempt.id,
          driverProfileId: candidate.driverProfileId,
          attemptNumber: attemptIndex,
          score: candidate.score,
          explanation: candidate.explanation,
          offeredAt: now.toISOString(),
          expiresAt: offerExpiresAt.toISOString(),
        },
      });

      await recordAuditLog(tx, {
        actorUserId: null,
        action: 'booking.driver.offered',
        entityType: 'BookingAssignmentAttempt',
        entityId: createdAttempt.id,
        afterState: {
          bookingId: booking.id,
          driverProfileId: candidate.driverProfileId,
          attemptNumber: attemptIndex,
          strategy,
          score: candidate.score,
          expiresAt: offerExpiresAt.toISOString(),
        },
      });
    }
  });

  return {
    bookingId,
    strategy,
    offeredAttemptsCount: createdAttemptIds.length,
    attemptIds: createdAttemptIds,
    status: 'OFFERED',
    message: `Created ${createdAttemptIds.length} ${strategy} dispatch offer(s) for booking ${booking.id}.`,
  };
}
