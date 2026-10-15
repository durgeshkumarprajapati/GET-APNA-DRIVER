import 'server-only';
import { BookingStatus, AssignmentAttemptStatus } from '@prisma/client';
import { prisma, type Db } from '@/shared/database/prisma';
import { logger } from '@/shared/logging/logger';
import { getInteger } from '@/shared/config/configuration-service';
import { RedisLockService } from '@/shared/infrastructure/redis-lock-service';
import { findAndOfferNextDriver } from '@/modules/booking/application/matching-service';

const LOCK_KEY = 'lock:stalled-search-sweep';
const SWEEP_BATCH_SIZE = 50;

/** Module-level self-gate, same pattern as trip-reliability-sweep-job.ts. */
let lastRunAt = 0;

/**
 * findAndOfferNextDriver (matching-service.ts) returns NO_DRIVERS_FOUND
 * without creating a BookingAssignmentAttempt whenever the current search
 * radius turns up zero eligible candidates but the overall search hasn't
 * hit its deadline or max-radius yet — by design, so a momentary "nobody
 * nearby" doesn't waste one of the limited candidate-attempt slots. But
 * nothing else in the system ever calls findAndOfferNextDriver again for
 * that booking on its own: assignment-expiry-sweep-job.ts only looks at
 * PENDING attempts, and there is none. Without this sweep, a booking
 * created when no driver was briefly available nearby (a quiet night, a
 * rural pickup, a momentary gap) stalls in SEARCHING_DRIVER until its own
 * overall search deadline, even though a driver may have come online
 * seconds later and would otherwise have been found on the very next call.
 *
 * This also doubles as the retry path for "a driver just came online
 * nearby" — dispatch-search-service.ts's handleDriverOnlinePresence emits a
 * 'dispatch.active_search.reevaluate' outbox event for exactly this
 * scenario, but no handler is registered for it (a separate, now-dead
 * code path); this sweep re-checks every actively-searching, offer-less
 * booking on its own short interval regardless, so that signal reaching
 * the booking doesn't depend on a notification pipeline at all.
 */
export async function runStalledSearchSweep(
  db: Db = prisma,
): Promise<{ sweptCount: number; skipped: boolean }> {
  const intervalSeconds = await getInteger(
    'booking.matching.stalled_search_sweep_interval_seconds',
    15,
    db,
  );
  if (Date.now() - lastRunAt < intervalSeconds * 1000) {
    return { sweptCount: 0, skipped: true };
  }

  const acquired = await RedisLockService.acquireLock(LOCK_KEY, 30_000);
  if (!acquired) {
    return { sweptCount: 0, skipped: true };
  }

  try {
    lastRunAt = Date.now();

    const stalledBookings = await db.booking.findMany({
      where: {
        status: BookingStatus.SEARCHING_DRIVER,
        assignmentAttempts: { none: { status: AssignmentAttemptStatus.PENDING } },
      },
      select: { id: true },
      take: SWEEP_BATCH_SIZE,
    });

    let sweptCount = 0;
    for (const booking of stalledBookings) {
      try {
        await findAndOfferNextDriver(booking.id, db);
        sweptCount++;
      } catch (err) {
        logger.error(
          { bookingId: booking.id, error: err },
          'Failed to resume matching for a stalled (offer-less) driver search',
        );
      }
    }

    return { sweptCount, skipped: false };
  } finally {
    await RedisLockService.releaseLock(LOCK_KEY);
  }
}
