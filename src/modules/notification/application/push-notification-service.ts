import 'server-only';
import { PushSubscription } from '@prisma/client';
import { prisma, type Db } from '@/shared/database/prisma';
import { logger } from '@/shared/logging/logger';
import { pushDeliveryProvider } from '../infrastructure/push-provider';
import { WebPushSubscriptionInput, PushPayload } from '../domain/types';

export async function registerPushSubscription(
  userId: string,
  input: WebPushSubscriptionInput,
  db: Db = prisma,
): Promise<PushSubscription> {
  return await db.pushSubscription.upsert({
    where: { endpoint: input.endpoint },
    create: {
      userId,
      endpoint: input.endpoint,
      p256dhKey: input.keys.p256dh,
      authKey: input.keys.auth,
      userAgent: input.userAgent ?? null,
      deviceName: input.deviceName ?? null,
      isActive: true,
      lastSeenAt: new Date(),
    },
    update: {
      userId,
      p256dhKey: input.keys.p256dh,
      authKey: input.keys.auth,
      userAgent: input.userAgent ?? undefined,
      deviceName: input.deviceName ?? undefined,
      isActive: true,
      lastSeenAt: new Date(),
    },
  });
}

export async function removePushSubscription(
  userId: string,
  endpoint: string,
  db: Db = prisma,
): Promise<boolean> {
  const existing = await db.pushSubscription.findUnique({
    where: { endpoint },
  });

  if (!existing || existing.userId !== userId) {
    return false;
  }

  await db.pushSubscription.update({
    where: { endpoint },
    data: { isActive: false },
  });

  return true;
}

export async function listUserPushSubscriptions(
  userId: string,
  db: Db = prisma,
): Promise<PushSubscription[]> {
  return await db.pushSubscription.findMany({
    where: { userId, isActive: true },
    orderBy: { lastSeenAt: 'desc' },
  });
}

export async function sendPushToUser(
  userId: string,
  payload: PushPayload,
  db: Db = prisma,
): Promise<{ totalSent: number; totalFailed: number }> {
  const subscriptions = await listUserPushSubscriptions(userId, db);
  let totalSent = 0;
  let totalFailed = 0;

  for (const sub of subscriptions) {
    try {
      const res = await pushDeliveryProvider.sendPush(
        sub.endpoint,
        sub.p256dhKey,
        sub.authKey,
        payload,
      );

      if (res.success) {
        totalSent++;
      } else {
        totalFailed++;
        if (res.isExpired) {
          await db.pushSubscription.update({
            where: { id: sub.id },
            data: { isActive: false },
          });
        }
      }
    } catch (err) {
      totalFailed++;
      logger.error({ userId, subscriptionId: sub.id, error: err }, 'Failed to dispatch web push');
    }
  }

  return { totalSent, totalFailed };
}
