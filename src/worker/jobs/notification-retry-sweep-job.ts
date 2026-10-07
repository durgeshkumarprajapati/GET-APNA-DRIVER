import 'server-only';
import { prisma, type Db } from '@/shared/database/prisma';
import { getBoolean, getInteger } from '@/shared/config/configuration-service';
import { RedisLockService } from '@/shared/infrastructure/redis-lock-service';
import { processNotificationDeliveryRetries } from '@/modules/notification/application/notification-delivery-retry-service';
import type { DeliveryRetryResult } from '@/modules/notification/domain/notification-intelligence-types';

const LOCK_KEY = 'lock:notification-retry-sweep';

/** Module-level self-gate, same pattern as trip-reliability-sweep-job.ts. */
let lastRunAt = 0;

/**
 * processNotificationDeliveryRetries (Phase 90) was only ever reachable via
 * POST /api/notifications/retry — which any logged-in customer or driver
 * could call (withAuth only), and which nothing in this worker ever
 * invoked. So the retry/fallback path it implements never ran on its own;
 * failed/stuck deliveries just sat there until someone manually hit the
 * route. This registers it as a real periodic sweep, self-gated like the
 * other jobs in this loop.
 */
export async function runNotificationRetrySweep(
  db: Db = prisma,
): Promise<DeliveryRetryResult & { skipped: boolean }> {
  const enabled = await getBoolean('notifications.retry_sweep.enabled', true, db);
  if (!enabled) {
    return {
      processedCount: 0,
      retriedCount: 0,
      fallbackTriggeredCount: 0,
      failedCount: 0,
      skipped: true,
    };
  }

  const intervalSeconds = await getInteger('notifications.retry_sweep.interval_seconds', 60, db);
  if (Date.now() - lastRunAt < intervalSeconds * 1000) {
    return {
      processedCount: 0,
      retriedCount: 0,
      fallbackTriggeredCount: 0,
      failedCount: 0,
      skipped: true,
    };
  }

  const acquired = await RedisLockService.acquireLock(LOCK_KEY, 60_000);
  if (!acquired) {
    return {
      processedCount: 0,
      retriedCount: 0,
      fallbackTriggeredCount: 0,
      failedCount: 0,
      skipped: true,
    };
  }

  try {
    lastRunAt = Date.now();
    const result = await processNotificationDeliveryRetries(db);
    return { ...result, skipped: false };
  } finally {
    await RedisLockService.releaseLock(LOCK_KEY);
  }
}
