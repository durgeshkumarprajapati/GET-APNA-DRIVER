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
import { getTemplateForNotificationType } from './notification-template-registry';
import { CreateNotificationInput, NotificationFilterInput } from '../domain/types';

import { evaluateNotificationIntelligence } from './notification-intelligence-service';

export async function createNotification(
  input: CreateNotificationInput,
  db: Db = prisma,
): Promise<Notification> {
  const meta = getTemplateForNotificationType(input.type);
  const category = input.category ?? meta.category;
  const priority = input.priority ?? meta.priority;

  // Run Notification Intelligence evaluation (Quiet Hours, Frequency Capping, Idempotency)
  const evalResult = await evaluateNotificationIntelligence(
    {
      userId: input.userId,
      category,
      priority,
      idempotencyKey: input.idempotencyKey,
    },
    db,
  );

  // If duplicate idempotency key, return the already-created notification —
  // evaluateNotificationIntelligence already looked it up, no need to
  // re-query the same row.
  if (
    !evalResult.allowed &&
    evalResult.suppressedReason === 'DUPLICATE_IDEMPOTENCY' &&
    evalResult.existingNotification
  ) {
    logger.info(
      { idempotencyKey: input.idempotencyKey },
      'Notification already created (idempotent duplicate)',
    );
    return evalResult.existingNotification;
  }

  const actionUrl = input.actionUrl ?? meta.defaultActionUrl;
  const imageAsset = input.imageAsset ?? meta.imageAsset ?? null;
  const expiresAt = input.expiresAt ? new Date(input.expiresAt) : null;

  const notification = await db.notification.create({
    data: {
      userId: input.userId,
      type: input.type,
      category,
      title: input.title,
      body: input.body,
      actionUrl,
      imageAsset,
      data: (input.data ?? {}) as Prisma.InputJsonValue,
      priority,
      idempotencyKey: input.idempotencyKey ?? null,
      campaignId: input.campaignId ?? null,
      expiresAt,
    },
  });

  // Always create IN_APP delivery record
  await db.notificationDelivery.create({
    data: {
      notificationId: notification.id,
      channel: DeliveryChannel.IN_APP,
      status: evalResult.allowed ? DeliveryStatus.DELIVERED : DeliveryStatus.SKIPPED,
      failureReason: evalResult.suppressedReason
        ? `Suppressed: ${evalResult.suppressedReason}`
        : undefined,
      deliveredAt: evalResult.allowed ? new Date() : undefined,
    },
  });

  // Check if Push delivery is allowed by preferences & intelligence
  const pushEnabled =
    evalResult.allowed && evalResult.deliverableChannels.includes(DeliveryChannel.PUSH);

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
      // actionUrl travels inside `data` (not just the DB row) so the service
      // worker's notificationclick handler can open the exact right page
      // without re-deriving it from bookingId/paymentId heuristics that
      // don't cover every notification type (e.g. a role-specific URL like
      // booking-message notifications already compute).
      const pushData = { ...(input.data ?? {}), actionUrl };
      const entityId = (input.data?.bookingId ?? input.data?.paymentId) as string | undefined;

      const pushRes = await sendPushToUser(
        input.userId,
        {
          title: input.title,
          body: input.body,
          data: pushData,
          // Successive status updates for the same booking/payment replace
          // each other in the OS tray instead of stacking up; anything
          // without an associated entity (promotions, system announcements)
          // is left untagged so each one stays independently visible.
          tag: entityId ? `${category}-${entityId}` : undefined,
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
      } else if (pushRes.totalFailed > 0) {
        // A real send attempt failed (not just "no subscriptions") — this
        // must be FAILED, not SKIPPED, so processNotificationDeliveryRetries
        // (which only selects FAILED/PROCESSING rows) actually retries it.
        await db.notificationDelivery.update({
          where: { id: delivery.id },
          data: {
            status: DeliveryStatus.FAILED,
            failedAt: new Date(),
            failureReason: 'Push delivery failed for all active subscriptions',
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
    ...(filter.category ? { category: filter.category } : {}),
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

/**
 * System notification service to alert all platform Administrators when a new driver registers.
 */
export async function notifyAdminsOfDriverRegistration(
  driverProfileId: string,
  driverName: string,
  driverEmail?: string | null,
  db: Db = prisma,
): Promise<void> {
  try {
    const adminRoles = await db.userRole.findMany({
      where: {
        revokedAt: null,
        role: { code: 'ADMINISTRATOR' },
      },
      select: { userId: true },
    });

    let adminUserIds = Array.from(new Set(adminRoles.map((r) => r.userId)));

    if (adminUserIds.length === 0) {
      const fallbackAdmins = await db.user.findMany({
        where: { accountStatus: 'ACTIVE' },
        take: 5,
        select: { id: true },
      });
      adminUserIds = fallbackAdmins.map((a) => a.id);
    }

    const title = `🚨 New Driver Registration: ${driverName}`;
    const body = `Driver ${driverName}${driverEmail ? ` (${driverEmail})` : ''} has registered and is pending admin approval.`;

    for (const adminUserId of adminUserIds) {
      await createNotification(
        {
          userId: adminUserId,
          type: 'SYSTEM_ANNOUNCEMENT',
          category: 'SYSTEM',
          title,
          body,
          actionUrl: '/admin/drivers',
          priority: 'HIGH',
          data: { driverProfileId, driverName, driverEmail },
          idempotencyKey: `new-driver-${driverProfileId}-${adminUserId}`,
        },
        db,
      );
    }
  } catch (err) {
    logger.error({ err, driverProfileId }, 'Failed to notify admins of driver registration');
  }
}
