import { prisma, type Db } from '@/shared/database/prisma';
import { DeliveryChannel } from '@prisma/client';
import {
  NotificationEvaluationInput,
  NotificationEvaluationResult,
  QuietHoursSettings,
  FrequencyCapSettings,
  UserNotificationIntelligenceConfig,
} from '../domain/notification-intelligence-types';
import { shouldSuppressForQuietHours } from './quiet-hours-evaluator';
import { isFrequencyCapExceeded } from './frequency-cap-evaluator';
import { getUserNotificationPreferences } from './notification-preference-service';

export const DEFAULT_QUIET_HOURS: QuietHoursSettings = {
  quietHoursEnabled: true,
  quietHoursStart: '22:00',
  quietHoursEnd: '07:00',
  timezone: 'Asia/Kolkata',
};

export const DEFAULT_FREQUENCY_CAP: FrequencyCapSettings = {
  frequencyCapEnabled: true,
  maxNonUrgentPerDay: 3,
};

/**
 * Retrieves effective user notification intelligence config (Quiet Hours + Frequency Capping).
 * Reads from CustomerPreference or returns standard default defaults.
 */
export async function getUserNotificationIntelligenceConfig(
  userId: string,
  db: Db = prisma,
): Promise<UserNotificationIntelligenceConfig> {
  const custPref = db.customerPreference
    ? await db.customerPreference.findUnique({
        where: { userId },
      }).catch(() => null)
    : null;

  const rawPref = custPref as Record<string, unknown> | null;

  const quietHours: QuietHoursSettings = {
    quietHoursEnabled:
      typeof rawPref?.quietHoursEnabled === 'boolean'
        ? rawPref.quietHoursEnabled
        : DEFAULT_QUIET_HOURS.quietHoursEnabled,
    quietHoursStart:
      typeof rawPref?.quietHoursStart === 'string'
        ? rawPref.quietHoursStart
        : DEFAULT_QUIET_HOURS.quietHoursStart,
    quietHoursEnd:
      typeof rawPref?.quietHoursEnd === 'string'
        ? rawPref.quietHoursEnd
        : DEFAULT_QUIET_HOURS.quietHoursEnd,
    timezone:
      typeof rawPref?.timezone === 'string'
        ? rawPref.timezone
        : DEFAULT_QUIET_HOURS.timezone,
  };

  const frequencyCap: FrequencyCapSettings = {
    frequencyCapEnabled:
      typeof rawPref?.frequencyCapEnabled === 'boolean'
        ? rawPref.frequencyCapEnabled
        : DEFAULT_FREQUENCY_CAP.frequencyCapEnabled,
    maxNonUrgentPerDay:
      typeof rawPref?.maxNonUrgentPerDay === 'number'
        ? rawPref.maxNonUrgentPerDay
        : DEFAULT_FREQUENCY_CAP.maxNonUrgentPerDay,
  };

  return { quietHours, frequencyCap };
}

/**
 * Evaluates whether a notification should be created and delivered to a user,
 * taking into account idempotency deduplication, quiet hours, frequency capping,
 * and category channel preferences.
 */
export async function evaluateNotificationIntelligence(
  input: NotificationEvaluationInput,
  db: Db = prisma,
): Promise<NotificationEvaluationResult> {
  const currentTime = input.currentTime ?? new Date();

  // 1. Idempotency Deduplication Check
  if (input.idempotencyKey) {
    const existing = await db.notification.findUnique({
      where: { idempotencyKey: input.idempotencyKey },
    });
    if (existing) {
      return {
        allowed: false,
        suppressedReason: 'DUPLICATE_IDEMPOTENCY',
        deliverableChannels: [],
        originalCategory: input.category,
      };
    }
  }

  // 2. Load User Notification Config (Quiet Hours + Frequency Capping)
  const config = await getUserNotificationIntelligenceConfig(input.userId, db);

  // 3. Quiet Hours Evaluation
  if (shouldSuppressForQuietHours(input.category, input.priority, currentTime, config.quietHours)) {
    return {
      allowed: false,
      suppressedReason: 'QUIET_HOURS',
      deliverableChannels: [],
      originalCategory: input.category,
    };
  }

  // 4. Frequency Cap Evaluation
  const capExceeded = await isFrequencyCapExceeded(
    input.userId,
    input.category,
    input.priority,
    config.frequencyCap,
    db,
  );

  if (capExceeded) {
    return {
      allowed: false,
      suppressedReason: 'FREQUENCY_CAP_EXCEEDED',
      deliverableChannels: [],
      originalCategory: input.category,
    };
  }

  // 5. Category Preference Check
  const prefs = await getUserNotificationPreferences(input.userId, db);
  const catPref = prefs.find((p) => p.category === input.category);

  const deliverableChannels: DeliveryChannel[] = [DeliveryChannel.IN_APP];

  if (!catPref || catPref.push) deliverableChannels.push(DeliveryChannel.PUSH);
  if (!catPref || catPref.email) deliverableChannels.push(DeliveryChannel.EMAIL);
  if (!catPref || catPref.sms) deliverableChannels.push(DeliveryChannel.SMS);

  return {
    allowed: true,
    deliverableChannels,
    originalCategory: input.category,
  };
}
