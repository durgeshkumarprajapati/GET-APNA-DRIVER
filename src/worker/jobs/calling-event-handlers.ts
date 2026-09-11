import { OutboxEvent, NotificationType, NotificationPriority } from '@prisma/client';
import { logger } from '@/shared/logging/logger';
import { prisma, type Db } from '@/shared/database/prisma';
import { eventHandlerRegistry } from '../outbox/event-handler-registry';
import { createNotification } from '@/modules/notification/application/notification-service';

export function registerCallingEventHandlers(): void {
  // 1. Call Session Initiated
  eventHandlerRegistry.register(
    'calling.session_initiated',
    async (event: OutboxEvent, payload: Record<string, unknown>, db?: Db) => {
      const activeDb = db ?? prisma;
      const sessionId = payload.sessionId as string;
      const callType = payload.callType as string;
      const customerId = payload.customerId as string;

      logger.info(
        { eventId: event.id, sessionId, callType },
        'Processing calling.session_initiated outbox event',
      );

      if (customerId) {
        await createNotification(
          {
            userId: customerId,
            type: NotificationType.SYSTEM_ANNOUNCEMENT,
            title: 'Call Connecting',
            body: `Connecting your ${callType === 'CUSTOMER_TO_SUPPORT' ? 'Customer Care' : 'driver'} call...`,
            data: { sessionId, callType },
            priority: NotificationPriority.HIGH,
            idempotencyKey: `${event.id}-calling-initiated`,
          },
          activeDb,
        );
      }
    },
  );

  // 2. Call Session Status Changed
  eventHandlerRegistry.register(
    'calling.session_status_changed',
    async (event: OutboxEvent, payload: Record<string, unknown>, _db?: Db) => {
      const sessionId = payload.sessionId as string;
      const status = payload.status as string;

      logger.info(
        { eventId: event.id, sessionId, status },
        'Processing calling.session_status_changed outbox event',
      );
    },
  );

  // 3. Call Session Completed
  eventHandlerRegistry.register(
    'calling.session_completed',
    async (event: OutboxEvent, payload: Record<string, unknown>, _db?: Db) => {
      const sessionId = payload.sessionId as string;
      const status = payload.status as string;
      const durationSeconds = payload.durationSeconds as number | undefined;

      logger.info(
        { eventId: event.id, sessionId, status, durationSeconds },
        'Processing calling.session_completed outbox event',
      );
    },
  );
}
