import { prisma, type Db } from '@/shared/database/prisma';
import { logger } from '@/shared/logging/logger';
import { getInteger } from '@/shared/config/configuration-service';

export async function runRetentionCleanupJob(db: Db = prisma): Promise<{
  deletedOutboxEvents: number;
  deletedNotifications: number;
  deactivatedSubscriptions: number;
}> {
  const retentionDays = await getInteger('notification.retention_days', 90, db);
  const cutoffDate = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000);

  try {
    // Delete processed outbox events older than retention period
    const outboxResult = await db.outboxEvent.deleteMany({
      where: {
        status: 'PROCESSED',
        processedAt: { lt: cutoffDate },
      },
    });

    // Delete read notifications older than retention period
    const notificationResult = await db.notification.deleteMany({
      where: {
        status: 'READ',
        readAt: { lt: cutoffDate },
      },
    });

    // Deactivate push subscriptions not seen in last retention period
    const subscriptionResult = await db.pushSubscription.updateMany({
      where: {
        isActive: true,
        lastSeenAt: { lt: cutoffDate },
      },
      data: {
        isActive: false,
      },
    });

    logger.info(
      {
        retentionDays,
        deletedOutboxEvents: outboxResult.count,
        deletedNotifications: notificationResult.count,
        deactivatedSubscriptions: subscriptionResult.count,
      },
      'Completed retention cleanup job',
    );

    return {
      deletedOutboxEvents: outboxResult.count,
      deletedNotifications: notificationResult.count,
      deactivatedSubscriptions: subscriptionResult.count,
    };
  } catch (err) {
    logger.error({ error: err }, 'Error running retention cleanup job');
    return {
      deletedOutboxEvents: 0,
      deletedNotifications: 0,
      deactivatedSubscriptions: 0,
    };
  }
}
