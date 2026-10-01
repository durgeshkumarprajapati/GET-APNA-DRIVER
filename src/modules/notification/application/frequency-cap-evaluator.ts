import { prisma, type Db } from '@/shared/database/prisma';
import { FrequencyCapSettings, NON_URGENT_CATEGORIES } from '../domain/notification-intelligence-types';

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

  const count = db.notification?.count
    ? await db.notification.count({
        where: {
          userId,
          category: { in: nonUrgentCategoriesList },
          createdAt: { gte: twentyFourHoursAgo },
        },
      }).catch(() => 0)
    : 0;

  return count >= config.maxNonUrgentPerDay;
}
