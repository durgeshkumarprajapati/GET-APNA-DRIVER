import 'server-only';
import { prisma, type Db } from '@/shared/database/prisma';
import { BookingStatus, AssignmentAttemptStatus, DriverAvailabilityStatus } from '@prisma/client';
import { getOrCreateDriverProfile } from '@/modules/driver/application/services/driver-profile-service';
import { evaluateDriverEligibility } from '@/modules/driver/application/services/driver-eligibility-service';
import { removeDriverFromLiveIndex } from '@/modules/location/application/driver-location-service';
import { validateBookingStatusTransition } from '../domain/booking-state-machine';
import { insertOutboxEvent, triggerImmediateOutboxDispatch } from '@/shared/outbox/outbox-service';
import { recordAuditLog } from '@/shared/audit/audit-service';
import { findAndOfferNextDriver } from './matching-service';
import {
  AssignmentAttemptNotFoundError,
  AssignmentOfferExpiredError,
  AssignmentAlreadyRespondedError,
  BookingAlreadyAssignedError,
} from '../domain/errors';
import { DriverNotEligibleError } from '@/modules/driver/domain/errors';
import { assertNoDriverHireConflictWithLock } from '@/modules/driver/application/services/driver-hire-conflict-service';

export interface AssignmentAttemptDetail {
  id: string;
  bookingId: string;
  attemptNumber: number;
  status: AssignmentAttemptStatus;
  offeredAt: Date;
  expiresAt: Date;
  pickupLocation: {
    latitude: number;
    longitude: number;
    address: string;
    label: string | null;
  };
  bookingType: string;
  requestedStartTime: Date | null;
  customerNotes: string | null;
}

/**
 * Lists assignment offers for the authenticated driver.
 */
export async function listDriverAssignmentOffers(
  driverUserId: string,
  db: Db = prisma,
): Promise<AssignmentAttemptDetail[]> {
  const profile = await getOrCreateDriverProfile(driverUserId, db);

  const attempts = await db.bookingAssignmentAttempt.findMany({
    where: { driverProfileId: profile.id },
    include: { booking: true },
    orderBy: { createdAt: 'desc' },
    // Previously unbounded, with a full booking join per row.
    take: 200,
  });

  return attempts.map((a) => ({
    id: a.id,
    bookingId: a.bookingId,
    attemptNumber: a.attemptNumber,
    status: a.status,
    offeredAt: a.offeredAt,
    expiresAt: a.expiresAt,
    pickupLocation: {
      latitude: a.booking.pickupLatitude,
      longitude: a.booking.pickupLongitude,
      address: a.booking.pickupAddress,
      label: a.booking.pickupLabel,
    },
    bookingType: a.booking.bookingType,
    requestedStartTime: a.booking.requestedStartTime,
    customerNotes: a.booking.customerNotes,
  }));
}

/**
 * Atomically accepts a pending booking assignment offer for a driver.
 * Concurrency-safe: PostgreSQL transaction ensures only ONE driver can accept a booking.
 */
export async function acceptAssignmentOffer(
  driverUserId: string,
  attemptId: string,
  db: Db = prisma,
): Promise<void> {
  const profile = await getOrCreateDriverProfile(driverUserId, db);

  // 1. Evaluate Driver Eligibility & Availability
  const eligibility = await evaluateDriverEligibility(profile.id, db);
  if (!eligibility.isEligible) {
    throw new DriverNotEligibleError(eligibility.reasons);
  }

  const now = new Date();

  // 2. Perform Atomic PostgreSQL Transaction with Row Locks
  await db.$transaction(async (tx) => {
    const attempt = await tx.bookingAssignmentAttempt.findUnique({
      where: { id: attemptId },
      include: { booking: true },
    });

    if (!attempt) {
      throw new AssignmentAttemptNotFoundError(attemptId);
    }

    if (attempt.driverProfileId !== profile.id) {
      throw new AssignmentAttemptNotFoundError(attemptId);
    }

    if (now > attempt.expiresAt) {
      if (tx.bookingAssignmentAttempt?.updateMany) {
        // Conditional on status — if the expiry sweep (or anything else)
        // already resolved this row, this is a harmless no-op rather than
        // clobbering whatever it was changed to.
        await tx.bookingAssignmentAttempt.updateMany({
          where: { id: attemptId, status: AssignmentAttemptStatus.PENDING },
          data: { status: AssignmentAttemptStatus.EXPIRED, respondedAt: now },
        });
      }
      throw new AssignmentOfferExpiredError(attemptId);
    }

    if (attempt.status !== AssignmentAttemptStatus.PENDING) {
      throw new AssignmentAlreadyRespondedError(attemptId, attempt.status);
    }

    const booking = attempt.booking;
    if (booking.status !== BookingStatus.SEARCHING_DRIVER) {
      throw new BookingAlreadyAssignedError(booking.id);
    }

    // Check hire/schedule window overlap conflict for driver
    const hireStart =
      booking.hireStartAt ?? booking.requestedStartTime ?? booking.requestedAt ?? new Date();

    const rawMins =
      booking.hireDurationMinutes && booking.hireDurationMinutes > 0
        ? booking.hireDurationMinutes
        : booking.estimatedDurationMinutes && booking.estimatedDurationMinutes > 0
          ? booking.estimatedDurationMinutes
          : 60;
    const hireMins = Math.max(15, rawMins);

    const hireEnd =
      booking.hireEndAt && booking.hireEndAt > hireStart
        ? booking.hireEndAt
        : new Date(hireStart.getTime() + hireMins * 60 * 1000);

    await assertNoDriverHireConflictWithLock(
      {
        driverProfileId: profile.id,
        hireStartAt: hireStart,
        hireEndAt: hireEnd,
        excludeBookingId: booking.id,
      },
      tx,
    );

    validateBookingStatusTransition(booking.status, BookingStatus.DRIVER_ASSIGNED);

    // Regression: this was previously an unconditional update keyed only on
    // `id`, with the PENDING check above only a plain (non-locking) read.
    // Two concurrent accept calls for two different PENDING attempts on the
    // *same booking* could both pass that read before either committed,
    // then both reach this point — conditioning the write itself on
    // `status: PENDING` is what actually serializes them: PostgreSQL blocks
    // the second UPDATE on the first's row lock, then re-evaluates this
    // WHERE clause once unblocked, so the loser's count comes back 0
    // instead of silently overwriting an already-ACCEPTED/EXPIRED row.
    const attemptUpdate = await tx.bookingAssignmentAttempt.updateMany({
      where: { id: attemptId, status: AssignmentAttemptStatus.PENDING },
      data: {
        status: AssignmentAttemptStatus.ACCEPTED,
        respondedAt: now,
      },
    });
    if (attemptUpdate.count === 0) {
      throw new AssignmentAlreadyRespondedError(attemptId, attempt.status);
    }

    // Supersede / Cancel any other pending parallel assignment offers for this booking
    const pendingOtherAttempts = tx.bookingAssignmentAttempt?.findMany
      ? await tx.bookingAssignmentAttempt.findMany({
          where: {
            bookingId: booking.id,
            id: { not: attemptId },
            status: AssignmentAttemptStatus.PENDING,
          },
          select: { id: true, driverProfileId: true },
        })
      : [];

    if (pendingOtherAttempts.length > 0 && tx.bookingAssignmentAttempt?.updateMany) {
      await tx.bookingAssignmentAttempt.updateMany({
        where: {
          bookingId: booking.id,
          id: { not: attemptId },
          status: AssignmentAttemptStatus.PENDING,
        },
        data: {
          status: AssignmentAttemptStatus.CANCELLED,
          respondedAt: now,
          rejectionReason: 'SUPERSEDED_BY_ANOTHER_DRIVER_ACCEPTANCE',
        },
      });

      for (const otherAttempt of pendingOtherAttempts) {
        await insertOutboxEvent(tx, {
          eventType: 'booking.driver.superseded',
          aggregateType: 'BookingAssignmentAttempt',
          aggregateId: otherAttempt.id,
          payload: {
            bookingId: booking.id,
            attemptId: otherAttempt.id,
            driverProfileId: otherAttempt.driverProfileId,
            reason: 'SUPERSEDED_BY_ANOTHER_DRIVER_ACCEPTANCE',
            supersededAt: now.toISOString(),
          },
        });
      }
    }

    // Same reasoning as the attempt update above: two different PENDING
    // attempts for this same booking (which should not normally coexist,
    // but matching-service.ts has no hard DB guarantee against it — see
    // findAndOfferNextDriver) racing to accept must not both "succeed" at
    // the app layer. Conditioning on `status: SEARCHING_DRIVER` means only
    // the first committer's write actually matches; the loser's count
    // comes back 0 and the whole transaction (including its own attempt
    // update above) rolls back instead of silently overwriting the
    // winner's driverProfileId.
    const bookingUpdate = await tx.booking.updateMany({
      where: { id: booking.id, status: BookingStatus.SEARCHING_DRIVER },
      data: {
        status: BookingStatus.DRIVER_ASSIGNED,
        driverProfileId: profile.id,
        assignedAt: now,
      },
    });
    if (bookingUpdate.count === 0) {
      throw new BookingAlreadyAssignedError(booking.id);
    }

    // Mark driver availability status as BUSY
    await tx.driverProfile.update({
      where: { id: profile.id },
      data: {
        availabilityStatus: DriverAvailabilityStatus.BUSY,
      },
    });

    // Append Booking Log
    await tx.bookingLog.create({
      data: {
        bookingId: booking.id,
        actorUserId: driverUserId,
        fromStatus: booking.status,
        toStatus: BookingStatus.DRIVER_ASSIGNED,
        action: 'driver.assignment.accepted',
        reason: `Offer accepted by driver ${profile.id}`,
      },
    });

    // Write Outbox Event
    await insertOutboxEvent(tx, {
      eventType: 'booking.driver.assigned',
      aggregateType: 'Booking',
      aggregateId: booking.id,
      payload: {
        bookingId: booking.id,
        customerId: booking.customerId,
        driverUserId,
        driverProfileId: profile.id,
        attemptId: attempt.id,
        assignedAt: now.toISOString(),
      },
    });
  });

  // Notifies the customer (and driver) immediately rather than waiting for
  // the separate background worker's next poll.
  await triggerImmediateOutboxDispatch(db);

  // 3. Remove driver from Redis GEO live available-driver index
  await removeDriverFromLiveIndex(profile.id, db);

  // 4. Audit Log
  await recordAuditLog(db, {
    actorUserId: driverUserId,
    action: 'driver.assignment.accepted',
    entityType: 'BookingAssignmentAttempt',
    entityId: attemptId,
    afterState: {
      driverProfileId: profile.id,
      status: AssignmentAttemptStatus.ACCEPTED,
    },
  });
}

/**
 * Rejects an assignment offer for a driver and triggers matching for the next candidate.
 */
export async function rejectAssignmentOffer(
  driverUserId: string,
  attemptId: string,
  rejectionReason?: string,
  db: Db = prisma,
): Promise<void> {
  const profile = await getOrCreateDriverProfile(driverUserId, db);
  const now = new Date();

  let bookingIdToResume: string | null = null;

  await db.$transaction(async (tx) => {
    const attempt = await tx.bookingAssignmentAttempt.findUnique({
      where: { id: attemptId },
    });

    if (!attempt || attempt.driverProfileId !== profile.id) {
      throw new AssignmentAttemptNotFoundError(attemptId);
    }

    if (attempt.status !== AssignmentAttemptStatus.PENDING) {
      throw new AssignmentAlreadyRespondedError(attemptId, attempt.status);
    }

    await tx.bookingAssignmentAttempt.update({
      where: { id: attemptId },
      data: {
        status: AssignmentAttemptStatus.REJECTED,
        respondedAt: now,
        rejectionReason: rejectionReason || 'Rejected by driver',
      },
    });

    bookingIdToResume = attempt.bookingId;

    await insertOutboxEvent(tx, {
      eventType: 'booking.driver.rejected',
      aggregateType: 'BookingAssignmentAttempt',
      aggregateId: attemptId,
      payload: {
        bookingId: attempt.bookingId,
        driverProfileId: profile.id,
        rejectedAt: now.toISOString(),
        reason: rejectionReason,
      },
    });
  });

  await recordAuditLog(db, {
    actorUserId: driverUserId,
    action: 'driver.assignment.rejected',
    entityType: 'BookingAssignmentAttempt',
    entityId: attemptId,
    afterState: {
      driverProfileId: profile.id,
      status: AssignmentAttemptStatus.REJECTED,
      rejectionReason,
    },
  });

  // Attempt next matching candidate
  if (bookingIdToResume) {
    try {
      await findAndOfferNextDriver(bookingIdToResume, db);
    } catch {
      // Ignore background matching error
    }
  }
}
