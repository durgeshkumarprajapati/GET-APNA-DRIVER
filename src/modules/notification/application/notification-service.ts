import 'server-only';
import {
  Notification,
  NotificationStatus,
  DeliveryChannel,
  DeliveryStatus,
  Prisma,
} from '@prisma/client';
import { prisma, type Db } from '@/shared/database/prisma';
import { logger } from '@/shared/logging/logger';
import { realtime } from '@/shared/realtime/realtime-provider';
import { sendPushToUser } from './push-notification-service';
import {
  isChannelEnabledForCategory,
  NotificationCategory,
} from './notification-preference-service';
import { CreateNotificationInput, NotificationFilterInput } from '../domain/types';

function mapTypeToCategory(type: string): NotificationCategory {
  if (type.startsWith('BOOKING')) return 'BOOKING';
  if (type.startsWith('PAYMENT') || type.startsWith('FINANCE') || type.startsWith('SETTLEMENT'))
    return 'PAYMENT';
  if (type.startsWith('DRIVER')) return 'SAFETY';
  if (type.startsWith('SYSTEM_OFFER') || type.startsWith('SYSTEM_COUPON')) return 'PROMOTION';
  return 'SYSTEM';
}

export async function createNotification(
  input: CreateNotificationInput,
  db: Db = prisma,
): Promise<Notification> {
  // Check idempotency if key provided
  if (input.idempotencyKey) {
    const existing = await db.notification.findUnique({
      where: { idempotencyKey: input.idempotencyKey },
    });
    if (existing) {
      logger.info(
        { idempotencyKey: input.idempotencyKey },
        'Notification already created (idempotent duplicate)',
      );
      return existing;
    }
  }

  const notification = await db.notification.create({
    data: {
      userId: input.userId,
      type: input.type,
      title: input.title,
      body: input.body,
      data: (input.data ?? {}) as Prisma.InputJsonValue,
      priority: input.priority ?? 'NORMAL',
      idempotencyKey: input.idempotencyKey ?? null,
      campaignId: input.campaignId ?? null,
    },
  });

  // Always create IN_APP delivery record
  await db.notificationDelivery.create({
    data: {
      notificationId: notification.id,
      channel: DeliveryChannel.IN_APP,
      status: DeliveryStatus.DELIVERED,
      deliveredAt: new Date(),
    },
  });

  // Check category preferences for Push delivery
  const category = mapTypeToCategory(input.type);
  const pushEnabled = await isChannelEnabledForCategory(input.userId, category, 'push', db);

  if (pushEnabled) {
    // Attempt Push Delivery
    const delivery = await db.notificationDelivery.create({
      data: {
        notificationId: notification.id,
        channel: DeliveryChannel.PUSH,
        status: DeliveryStatus.PROCESSING,
        lastAttemptAt: new Date(),
      },
    });

    try {
      const pushRes = await sendPushToUser(
        input.userId,
        {
          title: input.title,
          body: input.body,
          data: input.data,
        },
        db,
      );

      if (pushRes.totalSent > 0) {
        await db.notificationDelivery.update({
          where: { id: delivery.id },
          data: {
            status: DeliveryStatus.DELIVERED,
            deliveredAt: new Date(),
            attemptCount: 1,
          },
        });
      } else {
        await db.notificationDelivery.update({
          where: { id: delivery.id },
          data: {
            status: DeliveryStatus.SKIPPED,
            failureReason: 'No active push subscriptions found for user',
            attemptCount: 1,
          },
        });
      }
    } catch (err) {
      await db.notificationDelivery.update({
        where: { id: delivery.id },
        data: {
          status: DeliveryStatus.FAILED,
          failedAt: new Date(),
          failureReason: err instanceof Error ? err.message : String(err),
          attemptCount: 1,
        },
      });
    }
  }

  // Publish real-time event optimization if bookingId is in data payload
  if (input.data && typeof input.data.bookingId === 'string') {
    try {
      realtime.publishBookingUpdate(input.data.bookingId, input.type, {
        notificationId: notification.id,
        title: notification.title,
        body: notification.body,
      });
    } catch {
      // Real-time failure is non-blocking fallback
    }
  }

  return notification;
}

export async function listUserNotifications(
  filter: NotificationFilterInput,
  db: Db = prisma,
): Promise<{ items: Notification[]; total: number }> {
  const where: Prisma.NotificationWhereInput = {
    userId: filter.userId,
    ...(filter.type ? { type: filter.type } : {}),
    ...(filter.status ? { status: filter.status } : {}),
  };

  const [items, total] = await Promise.all([
    db.notification.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: filter.limit ?? 20,
      skip: filter.offset ?? 0,
    }),
    db.notification.count({ where }),
  ]);

  return { items, total };
}

export async function getUnreadNotificationCount(userId: string, db: Db = prisma): Promise<number> {
  return await db.notification.count({
    where: {
      userId,
      status: NotificationStatus.UNREAD,
    },
  });
}

export async function markNotificationAsRead(
  userId: string,
  notificationId: string,
  db: Db = prisma,
): Promise<Notification | null> {
  const existing = await db.notification.findUnique({
    where: { id: notificationId },
  });

  if (!existing || existing.userId !== userId) {
    return null;
  }

  if (existing.status === NotificationStatus.READ) {
    return existing;
  }

  return await db.notification.update({
    where: { id: notificationId },
    data: {
      status: NotificationStatus.READ,
      readAt: new Date(),
    },
  });
}

export async function markAllNotificationsAsRead(userId: string, db: Db = prisma): Promise<number> {
  const result = await db.notification.updateMany({
    where: {
      userId,
      status: NotificationStatus.UNREAD,
    },
    data: {
      status: NotificationStatus.READ,
      readAt: new Date(),
    },
  });

  return result.count;
}
