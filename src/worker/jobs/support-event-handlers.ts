import { OutboxEvent, NotificationType, NotificationPriority } from '@prisma/client';
import { logger } from '@/shared/logging/logger';
import { prisma, type Db } from '@/shared/database/prisma';
import { eventHandlerRegistry } from '../outbox/event-handler-registry';
import { createNotification } from '@/modules/notification/application/notification-service';

export function registerSupportEventHandlers(): void {
  // 1. Support Ticket Created
  eventHandlerRegistry.register(
    'support.ticket_created',
    async (event: OutboxEvent, payload: Record<string, unknown>, db?: Db) => {
      const activeDb = db ?? prisma;
      const ticketId = payload.ticketId as string;
      const ticketNumber = payload.ticketNumber as string;
      const customerId = payload.customerId as string;
      const subject = payload.subject as string;

      logger.info(
        { eventId: event.id, ticketNumber },
        'Processing support.ticket_created outbox event',
      );

      if (customerId) {
        await createNotification(
          {
            userId: customerId,
            type: NotificationType.SYSTEM_ANNOUNCEMENT,
            title: 'Support Request Received',
            body: `Your support request ${ticketNumber} ("${subject}") has been created. Our team will respond shortly.`,
            data: { ticketId, ticketNumber },
            priority: NotificationPriority.NORMAL,
            idempotencyKey: `${event.id}-customer-ticket-created`,
          },
          activeDb,
        );
      }
    },
  );

  // 2. Support Ticket Responded
  eventHandlerRegistry.register(
    'support.ticket_responded',
    async (event: OutboxEvent, payload: Record<string, unknown>, db?: Db) => {
      const activeDb = db ?? prisma;
      const ticketId = payload.ticketId as string;
      const ticketNumber = payload.ticketNumber as string;
      const customerId = payload.customerId as string;
      const authorRole = payload.authorRole as string;

      logger.info(
        { eventId: event.id, ticketNumber, authorRole },
        'Processing support.ticket_responded outbox event',
      );

      // Notify customer when support agent responds
      if (authorRole === 'SUPPORT_AGENT' && customerId) {
        await createNotification(
          {
            userId: customerId,
            type: NotificationType.SYSTEM_ANNOUNCEMENT,
            title: 'New Support Response',
            body: `Customer Support has responded to ticket ${ticketNumber}.`,
            data: { ticketId, ticketNumber },
            priority: NotificationPriority.HIGH,
            idempotencyKey: `${event.id}-customer-support-response`,
          },
          activeDb,
        );
      }
    },
  );

  // 3. Support Ticket Status Changed
  eventHandlerRegistry.register(
    'support.ticket_status_changed',
    async (event: OutboxEvent, payload: Record<string, unknown>, db?: Db) => {
      const activeDb = db ?? prisma;
      const ticketId = payload.ticketId as string;
      const ticketNumber = payload.ticketNumber as string;
      const newStatus = payload.newStatus as string;
      const customerId = payload.customerId as string;

      logger.info(
        { eventId: event.id, ticketNumber, newStatus },
        'Processing support.ticket_status_changed outbox event',
      );

      if (customerId) {
        await createNotification(
          {
            userId: customerId,
            type: NotificationType.SYSTEM_ANNOUNCEMENT,
            title: `Support Ticket ${newStatus.replace('_', ' ')}`,
            body: `Status of support ticket ${ticketNumber} changed to ${newStatus}.`,
            data: { ticketId, ticketNumber, status: newStatus },
            priority: NotificationPriority.NORMAL,
            idempotencyKey: `${event.id}-customer-status-changed`,
          },
          activeDb,
        );
      }
    },
  );
}
