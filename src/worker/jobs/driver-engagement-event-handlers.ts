import 'server-only';
import { logger } from '@/shared/logging/logger';
import { eventHandlerRegistry } from '../outbox/event-handler-registry';
import { evaluateDriverEngagement } from '@/modules/driver-engagement/application/driver-engagement-service';

export function registerDriverEngagementEventHandlers(): void {
  eventHandlerRegistry.register('booking.completed', async (event, payload, db) => {
    const driverProfileId = (payload.driverProfileId as string) || (payload.driverId as string);
    if (!driverProfileId) {
      logger.warn({ eventId: event.id }, 'booking.completed outbox event missing driverProfileId');
      return;
    }

    try {
      const { newUnlocks } = await evaluateDriverEngagement(
        driverProfileId,
        event.createdAt ? new Date(event.createdAt) : new Date(),
        db,
      );

      if (newUnlocks.length > 0) {
        logger.info(
          { driverProfileId, newUnlocks },
          'Driver unlocked new achievements on trip completion',
        );
      }
    } catch (err: unknown) {
      logger.error(
        { error: err, driverProfileId, eventId: event.id },
        'Failed to process driver engagement on booking.completed event',
      );
      throw err;
    }
  });

  eventHandlerRegistry.register('review.created', async (event, payload, db) => {
    const driverProfileId = payload.driverProfileId as string;
    if (!driverProfileId) return;

    try {
      await evaluateDriverEngagement(driverProfileId, new Date(), db);
    } catch (err: unknown) {
      logger.error(
        { error: err, driverProfileId, eventId: event.id },
        'Failed to process driver engagement on review.created event',
      );
    }
  });

  eventHandlerRegistry.register('driver.goal.updated', async (event, payload, db) => {
    const driverProfileId = payload.driverProfileId as string;
    if (!driverProfileId) return;

    try {
      await evaluateDriverEngagement(driverProfileId, new Date(), db);
    } catch (err: unknown) {
      logger.error(
        { error: err, driverProfileId, eventId: event.id },
        'Failed to process driver engagement on driver.goal.updated event',
      );
    }
  });
}
