import {
  NotificationType,
  NotificationPriority,
  NotificationStatus,
  CampaignTargetAudience,
} from '@prisma/client';

export interface CreateNotificationInput {
  userId: string;
  type: NotificationType;
  title: string;
  body: string;
  data?: Record<string, unknown>;
  priority?: NotificationPriority;
  idempotencyKey?: string;
  campaignId?: string;
}

export interface WebPushSubscriptionInput {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
  userAgent?: string;
  deviceName?: string;
}

export interface CreateCampaignInput {
  title: string;
  body: string;
  targetAudience: CampaignTargetAudience;
  targetUserIds?: string[];
  scheduledAt?: string | Date;
}

export interface NotificationFilterInput {
  userId: string;
  type?: NotificationType;
  status?: NotificationStatus;
  limit?: number;
  offset?: number;
}

export interface PushPayload {
  title: string;
  body: string;
  data?: Record<string, unknown>;
  icon?: string;
  badge?: string;
}
