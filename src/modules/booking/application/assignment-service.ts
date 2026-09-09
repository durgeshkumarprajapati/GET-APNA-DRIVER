import 'server-only';
import { prisma, type Db } from '@/shared/database/prisma';
import { BookingStatus, AssignmentAttemptStatus, DriverAvailabilityStatus } from '@prisma/client';
import { getOrCreateDriverProfile } from '@/modules/driver/application/services/driver-profile-service';
import { evaluateDriverEligibility } from '@/modules/driver/application/services/driver-eligibility-service';
import { removeDriverFromLiveIndex } from '@/modules/location/application/driver-location-service';
import { validateBookingStatusTransition } from '../domain/booking-state-machine';
import { insertOutboxEvent } from '@/shared/outbox/outbox-service';
import { recordAuditLog } from '@/shared/audit/audit-service';
import { findAndOfferNextDriver } from './matching-service';
import {
  AssignmentAttemptNotFoundError,
  AssignmentOfferExpiredError,
  AssignmentAlreadyRespondedError,
  BookingAlreadyAssignedError,
} from '../domain/errors';
import { DriverNotEligibleError } from '@/modules/driver/domain/errors';

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

    if (attempt.status !== AssignmentAttemptStatus.PENDING) {
      throw new AssignmentAlreadyRespondedError(attemptId, attempt.status);
    }

    if (now > attempt.expiresAt) {
      await tx.bookingAssignmentAttempt.update({
        where: { id: attemptId },
        data: { status: AssignmentAttemptStatus.EXPIRED },
      });
      throw new AssignmentOfferExpiredError(attemptId);
    }

    const booking = attempt.booking;
    if (booking.status !== BookingStatus.SEARCHING_DRIVER) {
      throw new BookingAlreadyAssignedError(booking.id);
    }

    validateBookingStatusTransition(booking.status, BookingStatus.DRIVER_ASSIGNED);

    // Update assignment attempt status
    await tx.bookingAssignmentAttempt.update({
      where: { id: attemptId },
      data: {
        status: AssignmentAttemptStatus.ACCEPTED,
        respondedAt: now,
      },
    });

    // Update booking status and assigned driver reference
    await tx.booking.update({
      where: { id: booking.id },
      data: {
        status: BookingStatus.DRIVER_ASSIGNED,
        driverProfileId: profile.id,
        assignedAt: now,
      },
    });

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
        driverProfileId: profile.id,
        attemptId: attempt.id,
        assignedAt: now.toISOString(),
      },
    });
  });

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
