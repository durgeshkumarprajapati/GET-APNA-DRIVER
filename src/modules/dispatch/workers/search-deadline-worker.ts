import 'server-only';
import { BookingStatus } from '@prisma/client';
import { prisma, type Db } from '@/shared/database/prisma';
import { RedisLockService } from '@/shared/infrastructure/redis-lock-service';
import {
  cancelBookingNoDriverFound,
  SEARCH_DEADLINE_SECONDS,
} from '../application/dispatch-search-service';

export interface ProcessExpiredSearchesResult {
  processedCount: number;
  cancelledCount: number;
  failedCount: number;
}

/**
 * Background worker task that checks for expired active searches (> 120 seconds)
 * and executes server-authoritative 2-minute booking cancellation with reason `NO_ACTIVE_DRIVER_NEARBY`.
 * Concurrent execution is protected using RedisLockService.
 */
export async function processExpiredBookingSearches(
  db: Db = prisma,
): Promise<ProcessExpiredSearchesResult> {
  const lockKey = 'worker:lock:dispatch-search-deadline';
  const lockAcquired = await RedisLockService.acquireLock(lockKey, 30000);

  if (!lockAcquired) {
    return { processedCount: 0, cancelledCount: 0, failedCount: 0 };
  }

  let processedCount = 0;
  let cancelledCount = 0;
  let failedCount = 0;

  try {
    const now = new Date();
    const cutoffTime = new Date(now.getTime() - SEARCH_DEADLINE_SECONDS * 1000);

    // Query active SEARCHING_DRIVER bookings whose search deadline has expired
    const expiredBookings = await db.booking.findMany({
      where: {
        status: BookingStatus.SEARCHING_DRIVER,
        OR: [
          { expiresAt: { lte: now } },
          { searchStartedAt: { lte: cutoffTime } },
          { requestedAt: { lte: cutoffTime } },
        ],
      },
      select: { id: true, searchStartedAt: true, requestedAt: true },
      take: 100,
    });

    processedCount = expiredBookings.length;

    for (const booking of expiredBookings) {
      try {
        const result = await cancelBookingNoDriverFound(booking.id, db);
        if (result.cancelled) {
          cancelledCount++;
        }
      } catch {
        failedCount++;
      }
    }
  } finally {
    await RedisLockService.releaseLock(lockKey);
  }

  return { processedCount, cancelledCount, failedCount };
}
