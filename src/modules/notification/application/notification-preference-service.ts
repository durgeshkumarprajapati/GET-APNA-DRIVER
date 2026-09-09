import 'server-only';
import { NotificationPreference } from '@prisma/client';
import { prisma, type Db } from '@/shared/database/prisma';

export const NOTIFICATION_CATEGORIES = [
  'BOOKING',
  'PAYMENT',
  'PROMOTION',
  'SYSTEM',
  'MARKETING',
  'SAFETY',
] as const;

export type NotificationCategory = (typeof NOTIFICATION_CATEGORIES)[number];

export interface UpdatePreferenceInput {
  category: NotificationCategory;
  push?: boolean;
  email?: boolean;
  sms?: boolean;
}

export async function getUserNotificationPreferences(
  userId: string,
  db: Db = prisma,
): Promise<NotificationPreference[]> {
  const existing = await db.notificationPreference.findMany({
    where: { userId },
  });

  const map = new Map(existing.map((p) => [p.category, p]));

  // Ensure default preference rows exist for all categories
  const preferences: NotificationPreference[] = [];
  for (const category of NOTIFICATION_CATEGORIES) {
    if (map.has(category)) {
      preferences.push(map.get(category)!);
    } else {
      preferences.push({
        id: `default-${category}`,
        userId,
        category,
        push: true,
        email: true,
        sms: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    }
  }

  return preferences;
}

export async function updateUserNotificationPreference(
  userId: string,
  input: UpdatePreferenceInput,
  db: Db = prisma,
): Promise<NotificationPreference> {
  // SAFETY notifications cannot be disabled by business policy
  const push = input.category === 'SAFETY' ? true : (input.push ?? true);
  const email = input.category === 'SAFETY' ? true : (input.email ?? true);
  const sms = input.category === 'SAFETY' ? true : (input.sms ?? true);

  return await db.notificationPreference.upsert({
    where: {
      userId_category: {
        userId,
        category: input.category,
      },
    },
    create: {
      userId,
      category: input.category,
      push,
      email,
      sms,
    },
    update: {
      push,
      email,
      sms,
    },
  });
}

export async function isChannelEnabledForCategory(
  userId: string,
  category: NotificationCategory,
  channel: 'push' | 'email' | 'sms',
  db: Db = prisma,
): Promise<boolean> {
  if (category === 'SAFETY') return true;

  const pref = await db.notificationPreference.findUnique({
    where: {
      userId_category: {
        userId,
        category,
      },
    },
  });

  if (!pref) return true; // Default enabled
  return pref[channel];
}
