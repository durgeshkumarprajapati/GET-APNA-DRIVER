import { prisma, type Db } from '@/shared/database/prisma';
import {
  FrequencyCapSettings,
  NON_URGENT_CATEGORIES,
} from '../domain/notification-intelligence-types';

/**
 * Checks if sending a non-urgent notification would exceed the user's daily frequency cap.
 */
export async function isFrequencyCapExceeded(
  userId: string,
  category: string,
  priority: string | undefined,
  config: FrequencyCapSettings,
  db: Db = prisma,
): Promise<boolean> {
  if (!config.frequencyCapEnabled) {
    return false;
  }

  // Urgent / High priority notifications always bypass frequency cap
  if (priority === 'HIGH' || priority === 'URGENT') {
    return false;
  }

  // Only non-urgent categories are frequency capped
  if (!NON_URGENT_CATEGORIES.has(category)) {
    return false;
  }

  const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

  const nonUrgentCategoriesList = Array.from(NON_URGENT_CATEGORIES);

  // Only counts notifications that were actually delivered to the user's
  // in-app inbox — a row createNotification saved as SKIPPED (suppressed by
  // quiet hours or this very cap) must not keep counting against the cap,
  // or a user who hit the cap once stays capped forever. HIGH/URGENT rows
  // bypass the cap check above but are still saved in a non-urgent
  // category, so they're excluded here too — bypassing the cap shouldn't
  // also consume another notification's budget.
  const count = await db.notification
    .count({
      where: {
        userId,
        category: { in: nonUrgentCategoriesList },
        priority: { notIn: ['HIGH', 'URGENT'] },
        createdAt: { gte: twentyFourHoursAgo },
        deliveries: { some: { channel: 'IN_APP', status: 'DELIVERED' } },
      },
    })
    .catch(() => 0);

  return count >= config.maxNonUrgentPerDay;
}
