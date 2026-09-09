import { OutboxEvent, NotificationType, NotificationPriority } from '@prisma/client';
import { logger } from '@/shared/logging/logger';
import { prisma, type Db } from '@/shared/database/prisma';
import { eventHandlerRegistry } from '../outbox/event-handler-registry';
import { createNotification } from '@/modules/notification/application/notification-service';

export function registerSafetyAndDisputeEventHandlers(): void {
  // -------------------------------------------------------------------------
  // Safety Incident Outbox Handlers
  // -------------------------------------------------------------------------
  eventHandlerRegistry.register(
    'safety.incident.created',
    async (event: OutboxEvent, payload: Record<string, unknown>, db?: Db) => {
      const activeDb = db ?? prisma;
      const incidentId = payload.incidentId as string;
      const incidentNumber = payload.incidentNumber as string;
      const reporterUserId = payload.reporterUserId as string;
      const customerId = payload.customerId as string | null;

      logger.info(
        { eventId: event.id, incidentNumber },
        'Processing safety.incident.created outbox event',
      );

      // 1. Send high-priority notification to reporter
      if (reporterUserId) {
        await createNotification(
          {
            userId: reporterUserId,
            type: NotificationType.SAFETY_SOS_TRIGGERED,
            title: '🚨 Emergency SOS Dispatched',
            body: `Safety incident ${incidentNumber} has been opened. Our emergency response operators are acting immediately.`,
            data: { incidentId, incidentNumber },
            priority: NotificationPriority.URGENT,
            idempotencyKey: `${event.id}-reporter-sos`,
          },
          activeDb,
        );
      }

      // 2. If customer is different from reporter, notify customer
      if (customerId && customerId !== reporterUserId) {
        await createNotification(
          {
            userId: customerId,
            type: NotificationType.SAFETY_SOS_TRIGGERED,
            title: '🚨 Emergency SOS Alert on Active Trip',
            body: `An emergency incident (${incidentNumber}) was reported for your booking. Safety support has been engaged.`,
            data: { incidentId, incidentNumber },
            priority: NotificationPriority.URGENT,
            idempotencyKey: `${event.id}-customer-sos`,
          },
          activeDb,
        );
      }
    },
  );

  eventHandlerRegistry.register(
    'safety.incident.updated',
    async (event: OutboxEvent, payload: Record<string, unknown>, db?: Db) => {
      const activeDb = db ?? prisma;
      const incidentId = payload.incidentId as string;
      const incidentNumber = payload.incidentNumber as string;
      const toStatus = payload.toStatus as string;
      const reporterUserId = payload.reporterUserId as string;

      if (reporterUserId) {
        await createNotification(
          {
            userId: reporterUserId,
            type: NotificationType.SAFETY_INCIDENT_UPDATED,
            title: `Safety Incident ${toStatus}`,
            body: `Your safety incident ${incidentNumber} has been updated to status: ${toStatus}.`,
            data: { incidentId, incidentNumber, status: toStatus },
            priority: NotificationPriority.HIGH,
            idempotencyKey: `${event.id}-safety-update`,
          },
          activeDb,
        );
      }
    },
  );

  // -------------------------------------------------------------------------
  // Dispute Outbox Handlers
  // -------------------------------------------------------------------------
  eventHandlerRegistry.register(
    'dispute.created',
    async (event: OutboxEvent, payload: Record<string, unknown>, db?: Db) => {
      const activeDb = db ?? prisma;
      const disputeId = payload.disputeId as string;
      const disputeNumber = payload.disputeNumber as string;
      const raisedByUserId = payload.raisedByUserId as string;

      if (raisedByUserId) {
        await createNotification(
          {
            userId: raisedByUserId,
            type: NotificationType.DISPUTE_CREATED,
            title: 'Dispute Received',
            body: `Your dispute ticket ${disputeNumber} has been logged. Our support team is currently reviewing it.`,
            data: { disputeId, disputeNumber },
            priority: NotificationPriority.NORMAL,
            idempotencyKey: `${event.id}-dispute-created`,
          },
          activeDb,
        );
      }
    },
  );

  eventHandlerRegistry.register(
    'dispute.status_changed',
    async (event: OutboxEvent, payload: Record<string, unknown>, db?: Db) => {
      const activeDb = db ?? prisma;
      const disputeId = payload.disputeId as string;
      const disputeNumber = payload.disputeNumber as string;
      const toStatus = payload.toStatus as string;
      const raisedByUserId = payload.raisedByUserId as string;

      if (raisedByUserId) {
        await createNotification(
          {
            userId: raisedByUserId,
            type: NotificationType.DISPUTE_UPDATED,
            title: 'Dispute Ticket Updated',
            body: `Dispute ${disputeNumber} status changed to ${toStatus}.`,
            data: { disputeId, disputeNumber, status: toStatus },
            priority: NotificationPriority.NORMAL,
            idempotencyKey: `${event.id}-dispute-updated`,
          },
          activeDb,
        );
      }
    },
  );

  eventHandlerRegistry.register(
    'dispute.resolved',
    async (event: OutboxEvent, payload: Record<string, unknown>, db?: Db) => {
      const activeDb = db ?? prisma;
      const disputeId = payload.disputeId as string;
      const disputeNumber = payload.disputeNumber as string;
      const raisedByUserId = payload.raisedByUserId as string;
      const resolutionSummary = payload.resolutionSummary as string;

      if (raisedByUserId) {
        await createNotification(
          {
            userId: raisedByUserId,
            type: NotificationType.DISPUTE_RESOLVED,
            title: 'Dispute Resolved',
            body: `Dispute ${disputeNumber} has been resolved: ${resolutionSummary || 'Completed by customer support.'}`,
            data: { disputeId, disputeNumber, resolutionSummary },
            priority: NotificationPriority.HIGH,
            idempotencyKey: `${event.id}-dispute-resolved`,
          },
          activeDb,
        );
      }
    },
  );
}
