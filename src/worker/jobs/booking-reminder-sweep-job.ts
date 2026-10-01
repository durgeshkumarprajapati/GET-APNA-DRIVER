import 'server-only';
import { prisma, type Db } from '@/shared/database/prisma';
import { getBoolean, getInteger } from '@/shared/config/configuration-service';
import { RedisLockService } from '@/shared/infrastructure/redis-lock-service';
import { generateBookingAndScheduleReminders } from '@/modules/notification/application/notification-reminder-service';
import type { ReminderGenerationResult } from '@/modules/notification/domain/notification-intelligence-types';

const LOCK_KEY = 'lock:booking-reminder-sweep';

/** Module-level self-gate, same pattern as trip-reliability-sweep-job.ts. */
let lastRunAt = 0;

/**
 * generateBookingAndScheduleReminders (Phase 90) was only reachable via
 * POST /api/notifications/reminders/trigger — any logged-in user, and
 * nothing in this worker ever called it, so scheduled-ride reminders never
 * fired on their own. Registers it as a real periodic sweep. A 5-minute
 * default interval is enough given the reminder window itself is 2 hours
 * wide — no need to poll every worker iteration.
 */
export async function runBookingReminderSweep(
  db: Db = prisma,
): Promise<ReminderGenerationResult & { skipped: boolean }> {
  const enabled = await getBoolean('notifications.reminder_sweep.enabled', true, db);
  if (!enabled) {
    return { remindersCreated: 0, skippedDuplicates: 0, targetUserIds: [], skipped: true };
  }

  const intervalSeconds = await getInteger('notifications.reminder_sweep.interval_seconds', 300, db);
  if (Date.now() - lastRunAt < intervalSeconds * 1000) {
    return { remindersCreated: 0, skippedDuplicates: 0, targetUserIds: [], skipped: true };
  }

  const acquired = await RedisLockService.acquireLock(LOCK_KEY, 60_000);
  if (!acquired) {
    return { remindersCreated: 0, skippedDuplicates: 0, targetUserIds: [], skipped: true };
  }

  try {
    lastRunAt = Date.now();
    const result = await generateBookingAndScheduleReminders(db);
    return { ...result, skipped: false };
  } finally {
    await RedisLockService.releaseLock(LOCK_KEY);
  }
}
