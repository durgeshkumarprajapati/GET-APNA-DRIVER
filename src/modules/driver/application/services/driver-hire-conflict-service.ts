import 'server-only';
import { BookingStatus, BookingType } from '@prisma/client';
import { prisma, type Db } from '@/shared/database/prisma';
import { RedisLockService } from '@/shared/infrastructure/redis-lock-service';
import { DriverScheduleConflictError } from '../../domain/errors';

export class DriverHireConflictError extends DriverScheduleConflictError {
  readonly conflictingBookingId?: string;

  constructor(message: string, conflictingBookingId?: string) {
    super(message);
    this.name = 'DriverHireConflictError';
    this.conflictingBookingId = conflictingBookingId;
  }
}

export interface DriverHireConflictCheckInput {
  driverProfileId: string;
  hireStartAt: Date;
  hireEndAt: Date;
  excludeBookingId?: string;
}

export interface DriverHireConflictResult {
  hasConflict: boolean;
  conflictingBookingId?: string;
  conflictingBookingType?: BookingType;
  conflictingStartAt?: Date;
  conflictingEndAt?: Date;
  reason?: string;
}

const TERMINAL_STATUSES: BookingStatus[] = [
  BookingStatus.CANCELLED,
  BookingStatus.EXPIRED,
  BookingStatus.TRIP_COMPLETED,
];

/**
 * Authoritative hire window conflict check service.
 * Performs half-open interval overlap math [start, end) against existing committed driver bookings.
 */
export async function getDriverHireConflicts(
  input: DriverHireConflictCheckInput,
  db: Db = prisma,
): Promise<DriverHireConflictResult> {
  const { driverProfileId, hireStartAt, hireEndAt, excludeBookingId } = input;

  if (hireStartAt >= hireEndAt) {
    return {
      hasConflict: true,
      reason: 'Requested hire start time must be strictly before hire end time.',
    };
  }

  if (!db.booking?.findMany) {
    return { hasConflict: false };
  }

  // Fetch active / committed bookings for this driver profile
  const bookings = await db.booking.findMany({
    where: {
      driverProfileId,
      status: { notIn: TERMINAL_STATUSES },
      ...(excludeBookingId ? { id: { not: excludeBookingId } } : {}),
    },
    select: {
      id: true,
      bookingType: true,
      status: true,
      requestedStartTime: true,
      requestedAt: true,
      hireStartAt: true,
      hireEndAt: true,
      estimatedDurationMinutes: true,
      hireDurationMinutes: true,
    },
  });

  for (const b of bookings) {
    // 1. Determine existing booking interval [existingStart, existingEnd)
    let existingStart: Date;
    let existingEnd: Date;

    if (
      b.bookingType === BookingType.HOURLY ||
      b.bookingType === BookingType.DAILY ||
      b.bookingType === BookingType.WEEKLY ||
      b.bookingType === BookingType.MONTHLY ||
      b.bookingType === BookingType.FULL_DAY ||
      b.bookingType === BookingType.MULTI_DAY
    ) {
      existingStart = b.hireStartAt ?? b.requestedStartTime ?? b.requestedAt;
      if (b.hireEndAt) {
        existingEnd = b.hireEndAt;
      } else {
        const durationMins = b.hireDurationMinutes ?? 60;
        existingEnd = new Date(existingStart.getTime() + durationMins * 60 * 1000);
      }
    } else {
      // Point-to-point / One-way / Round-trip scheduled booking
      existingStart = b.requestedStartTime ?? b.requestedAt;
      const tripMins = (b.estimatedDurationMinutes ?? 60) + 30; // 30 mins buffer for trip turnover
      existingEnd = new Date(existingStart.getTime() + tripMins * 60 * 1000);
    }

    // 2. Half-Open Interval Overlap Formula: [startA, endA) overlaps [startB, endB) iff startA < endB AND endA > startB
    if (existingStart < hireEndAt && existingEnd > hireStartAt) {
      return {
        hasConflict: true,
        conflictingBookingId: b.id,
        conflictingBookingType: b.bookingType,
        conflictingStartAt: existingStart,
        conflictingEndAt: existingEnd,
        reason: `Driver has a conflicting ${b.bookingType} booking (${b.id}) scheduled from ${existingStart.toISOString()} to ${existingEnd.toISOString()}.`,
      };
    }
  }

  return { hasConflict: false };
}

/**
 * Asserts that the requested driver hire window has zero conflicts.
 * Throws DriverHireConflictError if an overlap is detected.
 */
export async function assertNoDriverHireConflict(
  input: DriverHireConflictCheckInput,
  db: Db = prisma,
): Promise<void> {
  const result = await getDriverHireConflicts(input, db);
  if (result.hasConflict) {
    throw new DriverHireConflictError(
      result.reason || 'Driver has a conflicting booking during the requested hire window.',
      result.conflictingBookingId,
    );
  }
}

/**
 * Transactional & lock-protected hire conflict check for concurrent assignment race prevention.
 */
export async function assertNoDriverHireConflictWithLock(
  input: DriverHireConflictCheckInput,
  db: Db = prisma,
): Promise<void> {
  const lockKey = `lock:driver-hire:${input.driverProfileId}`;
  const acquired = await RedisLockService.acquireLock(lockKey, 15000);
  try {
    await assertNoDriverHireConflict(input, db);
  } finally {
    if (acquired) {
      await RedisLockService.releaseLock(lockKey);
    }
  }
}
