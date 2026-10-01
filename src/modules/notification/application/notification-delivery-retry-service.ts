import { prisma, type Db } from '@/shared/database/prisma';
import { DeliveryChannel, DeliveryStatus } from '@prisma/client';
import { sendPushToUser } from './push-notification-service';
import { emailProvider } from '../infrastructure/email-provider';
import { sendSmsNotification } from '../infrastructure/sms-provider';
import { DeliveryRetryResult } from '../domain/notification-intelligence-types';
import { logger } from '@/shared/logging/logger';

const MAX_ATTEMPTS = 3;

/**
 * Retries failed or pending notification deliveries with exponential backoff.
 * Triggers fallback channels (SMS/Email) if Push delivery fails after retries.
 */
export async function processNotificationDeliveryRetries(
  db: Db = prisma,
): Promise<DeliveryRetryResult> {
  let processedCount = 0;
  let retriedCount = 0;
  let fallbackTriggeredCount = 0;
  let failedCount = 0;

  const candidateDeliveries = await db.notificationDelivery.findMany({
    where: {
      status: { in: [DeliveryStatus.FAILED, DeliveryStatus.PROCESSING] },
      attemptCount: { lt: MAX_ATTEMPTS },
    },
    take: 20,
    include: {
      notification: {
        select: {
          id: true,
          userId: true,
          category: true,
          title: true,
          body: true,
          actionUrl: true,
          priority: true,
          data: true,
          user: {
            select: {
              identities: {
                select: {
                  providerName: true,
                  email: true,
                  phoneNumber: true,
                },
              },
            },
          },
        },
      },
    },
  });

  for (const delivery of candidateDeliveries) {
    processedCount++;

    // Calculate exponential backoff delay: 1 min, 2 min, 4 min
    const delayMinutes = Math.pow(2, delivery.attemptCount - 1);
    const minNextAttemptAt = new Date(
      (delivery.lastAttemptAt?.getTime() ?? Date.now()) + delayMinutes * 60 * 1000,
    );

    if (new Date() < minNextAttemptAt) {
      continue;
    }

    const { notification } = delivery;
    const emailIdent = notification.user.identities.find((i) => i.providerName === 'email' || i.email);
    const phoneIdent = notification.user.identities.find((i) => i.providerName === 'phone' || i.phoneNumber);
    const userEmail = emailIdent?.email || null;
    const userPhone = phoneIdent?.phoneNumber || null;

    try {
      if (delivery.channel === DeliveryChannel.PUSH) {
        const pushRes = await sendPushToUser(
          notification.userId,
          {
            title: notification.title,
            body: notification.body,
            data: { ...(notification.data as object ?? {}), actionUrl: notification.actionUrl },
          },
          db,
        );

        if (pushRes.totalSent > 0) {
          await db.notificationDelivery.update({
            where: { id: delivery.id },
            data: {
              status: DeliveryStatus.DELIVERED,
              deliveredAt: new Date(),
              attemptCount: delivery.attemptCount + 1,
            },
          });
          retriedCount++;
        } else {
          // Push failed or no active subscriptions — trigger Fallback Channel
          const nextAttempt = delivery.attemptCount + 1;
          await db.notificationDelivery.update({
            where: { id: delivery.id },
            data: {
              status: nextAttempt >= MAX_ATTEMPTS ? DeliveryStatus.FAILED : DeliveryStatus.FAILED,
              failedAt: new Date(),
              failureReason: 'Push subscription unreachable — fallback initiated',
              attemptCount: nextAttempt,
            },
          });

          // Trigger Fallback Channel (Email or SMS) for critical notifications
          const fallbackTriggered = await triggerFallbackChannel(notification, userEmail, userPhone, db);
          if (fallbackTriggered) {
            fallbackTriggeredCount++;
          } else {
            failedCount++;
          }
        }
      } else if (delivery.channel === DeliveryChannel.EMAIL && userEmail) {
        await emailProvider.sendEmail({
          toEmail: userEmail,
          subject: notification.title,
          bodyText: notification.body,
          htmlBody: `<p>${notification.body}</p>`,
        });

        await db.notificationDelivery.update({
          where: { id: delivery.id },
          data: {
            status: DeliveryStatus.DELIVERED,
            deliveredAt: new Date(),
            attemptCount: delivery.attemptCount + 1,
          },
        });
        retriedCount++;
      } else if (delivery.channel === DeliveryChannel.SMS && userPhone) {
        await sendSmsNotification({
          to: userPhone,
          message: `${notification.title}: ${notification.body}`,
        });

        await db.notificationDelivery.update({
          where: { id: delivery.id },
          data: {
            status: DeliveryStatus.DELIVERED,
            deliveredAt: new Date(),
            attemptCount: delivery.attemptCount + 1,
          },
        });
        retriedCount++;
      }
    } catch (err) {
      logger.error(
        { err, deliveryId: delivery.id },
        'Error during notification delivery retry',
      );
      await db.notificationDelivery.update({
        where: { id: delivery.id },
        data: {
          status: DeliveryStatus.FAILED,
          failedAt: new Date(),
          failureReason: err instanceof Error ? err.message : String(err),
          attemptCount: delivery.attemptCount + 1,
        },
      });
      failedCount++;
    }
  }

  return {
    processedCount,
    retriedCount,
    fallbackTriggeredCount,
    failedCount,
  };
}

async function triggerFallbackChannel(
  notification: {
    id: string;
    userId: string;
    category: string | null;
    title: string;
    body: string;
  },
  userEmail: string | null,
  userPhone: string | null,
  db: Db,
): Promise<boolean> {
  if (userPhone) {
    // Dispatch SMS Fallback
    await db.notificationDelivery.create({
      data: {
        notificationId: notification.id,
        channel: DeliveryChannel.SMS,
        status: DeliveryStatus.DELIVERED,
        deliveredAt: new Date(),
        attemptCount: 1,
      },
    });

    await sendSmsNotification({
      to: userPhone,
      message: `[GET APNA DRIVER] ${notification.title}: ${notification.body}`,
    });
    return true;
  } else if (userEmail) {
    // Dispatch Email Fallback
    await db.notificationDelivery.create({
      data: {
        notificationId: notification.id,
        channel: DeliveryChannel.EMAIL,
        status: DeliveryStatus.DELIVERED,
        deliveredAt: new Date(),
        attemptCount: 1,
      },
    });

    await emailProvider.sendEmail({
      toEmail: userEmail,
      subject: notification.title,
      bodyText: notification.body,
      htmlBody: `<p>${notification.body}</p>`,
    });
    return true;
  }

  return false;
}
