import { DeliveryChannel } from '@prisma/client';

export interface QuietHoursSettings {
  quietHoursEnabled: boolean;
  quietHoursStart: string; // HH:mm 24-hour format, e.g. "22:00"
  quietHoursEnd: string;   // HH:mm 24-hour format, e.g. "07:00"
  timezone: string;        // e.g. "Asia/Kolkata"
}

export interface FrequencyCapSettings {
  frequencyCapEnabled: boolean;
  maxNonUrgentPerDay: number; // default: 3
}

export interface UserNotificationIntelligenceConfig {
  quietHours: QuietHoursSettings;
  frequencyCap: FrequencyCapSettings;
}

export const NON_URGENT_CATEGORIES = new Set<string>([
  'PROMOTION',
  'COUPON',
  'REFERRAL',
  'LOYALTY',
  'REWARD',
  'SCRATCH',
  'MARKETING',
  'FAVORITE_DRIVER',
]);

export const CRITICAL_CATEGORIES = new Set<string>([
  'SAFETY',
  'BOOKING',
  'TRIP',
  'DISPATCH',
  'PAYMENT',
  'SCHEDULED_RIDE',
]);

export interface NotificationEvaluationInput {
  userId: string;
  category: string;
  priority?: 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';
  idempotencyKey?: string | null;
  currentTime?: Date;
}

export interface NotificationEvaluationResult {
  allowed: boolean;
  suppressedReason?: 'QUIET_HOURS' | 'FREQUENCY_CAP_EXCEEDED' | 'DUPLICATE_IDEMPOTENCY' | 'CATEGORY_DISABLED';
  deliverableChannels: DeliveryChannel[];
  originalCategory: string;
}

export interface ReminderGenerationResult {
  remindersCreated: number;
  skippedDuplicates: number;
  targetUserIds: string[];
}

export interface DeliveryRetryResult {
  processedCount: number;
  retriedCount: number;
  fallbackTriggeredCount: number;
  failedCount: number;
}
