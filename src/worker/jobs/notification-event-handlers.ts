import { OutboxEvent, NotificationType } from '@prisma/client';
import { logger } from '@/shared/logging/logger';
import { prisma, type Db } from '@/shared/database/prisma';
import { eventHandlerRegistry } from '../outbox/event-handler-registry';
import { createNotification } from '@/modules/notification/application/notification-service';
import { processCampaignDispatch } from '@/modules/notification/application/notification-campaign-service';

export function registerNotificationEventHandlers(): void {
  // -------------------------------------------------------------------------
  // Booking Events
  // -------------------------------------------------------------------------
  eventHandlerRegistry.register(
    'booking.created',
    async (event: OutboxEvent, payload: Record<string, unknown>, db?: Db) => {
      const customerId = payload.customerId as string;
      const bookingId = payload.bookingId as string;
      if (!customerId) return;

      await createNotification(
        {
          userId: customerId,
          type: NotificationType.BOOKING_CREATED,
          title: 'Booking Request Submitted',
          body: 'Your driver request has been created and we are matching a top-rated chauffeur.',
          data: { bookingId },
          idempotencyKey: `${event.id}-customer-created`,
        },
        db ?? prisma,
      );
    },
  );

  eventHandlerRegistry.register(
    'booking.driver.offered',
    async (event: OutboxEvent, payload: Record<string, unknown>, db?: Db) => {
      const driverUserId = payload.driverUserId as string;
      const bookingId = payload.bookingId as string;
      if (!driverUserId) return;

      await createNotification(
        {
          userId: driverUserId,
          type: NotificationType.BOOKING_DRIVER_OFFERED,
          title: 'New Trip Offer!',
          body: 'You have a new chauffeur dispatch offer. Tap to accept within 30 seconds.',
          data: { bookingId },
          idempotencyKey: `${event.id}-driver-offer`,
        },
        db ?? prisma,
      );
    },
  );

  eventHandlerRegistry.register(
    'booking.driver.assigned',
    async (event: OutboxEvent, payload: Record<string, unknown>, db?: Db) => {
      const customerId = payload.customerId as string;
      const driverUserId = payload.driverUserId as string;
      const bookingId = payload.bookingId as string;

      if (customerId) {
        await createNotification(
          {
            userId: customerId,
            type: NotificationType.BOOKING_DRIVER_ASSIGNED,
            title: 'Chauffeur Assigned!',
            body: 'A professional driver has accepted your booking and is preparing for trip pickup.',
            data: { bookingId },
            idempotencyKey: `${event.id}-customer-assigned`,
          },
          db ?? prisma,
        );
      }

      if (driverUserId) {
        await createNotification(
          {
            userId: driverUserId,
            type: NotificationType.BOOKING_DRIVER_ASSIGNED,
            title: 'Trip Assignment Confirmed',
            body: 'Trip assignment confirmed. Tap to navigate to pickup location.',
            data: { bookingId },
            idempotencyKey: `${event.id}-driver-assigned`,
          },
          db ?? prisma,
        );
      }
    },
  );

  eventHandlerRegistry.register(
    'booking.driver.en_route',
    async (event: OutboxEvent, payload: Record<string, unknown>, db?: Db) => {
      const customerId = payload.customerId as string;
      const bookingId = payload.bookingId as string;
      if (!customerId) return;

      await createNotification(
        {
          userId: customerId,
          type: NotificationType.BOOKING_DRIVER_EN_ROUTE,
          title: 'Chauffeur En Route',
          body: 'Your chauffeur is currently driving to your pickup location.',
          data: { bookingId },
          idempotencyKey: `${event.id}-customer-enroute`,
        },
        db ?? prisma,
      );
    },
  );

  eventHandlerRegistry.register(
    'booking.driver.arrived',
    async (event: OutboxEvent, payload: Record<string, unknown>, db?: Db) => {
      const customerId = payload.customerId as string;
      const bookingId = payload.bookingId as string;
      if (!customerId) return;

      await createNotification(
        {
          userId: customerId,
          type: NotificationType.BOOKING_DRIVER_ARRIVED,
          title: 'Chauffeur Arrived!',
          body: 'Your driver has arrived at your pickup location.',
          data: { bookingId },
          idempotencyKey: `${event.id}-customer-arrived`,
        },
        db ?? prisma,
      );
    },
  );

  eventHandlerRegistry.register(
    'booking.trip.started',
    async (event: OutboxEvent, payload: Record<string, unknown>, db?: Db) => {
      const customerId = payload.customerId as string;
      const bookingId = payload.bookingId as string;
      if (!customerId) return;

      await createNotification(
        {
          userId: customerId,
          type: NotificationType.BOOKING_TRIP_STARTED,
          title: 'Trip Started',
          body: 'Your trip has started. Enjoy a safe and pleasant ride with Get Apna Driver.',
          data: { bookingId },
          idempotencyKey: `${event.id}-customer-trip-started`,
        },
        db ?? prisma,
      );
    },
  );

  eventHandlerRegistry.register(
    'booking.trip.completed',
    async (event: OutboxEvent, payload: Record<string, unknown>, db?: Db) => {
      const customerId = payload.customerId as string;
      const driverUserId = payload.driverUserId as string;
      const bookingId = payload.bookingId as string;

      if (customerId) {
        await createNotification(
          {
            userId: customerId,
            type: NotificationType.BOOKING_TRIP_COMPLETED,
            title: 'Trip Completed',
            body: 'Thank you for riding with us! Please rate your chauffeur experience.',
            data: { bookingId },
            idempotencyKey: `${event.id}-customer-trip-completed`,
          },
          db ?? prisma,
        );
      }

      if (driverUserId) {
        await createNotification(
          {
            userId: driverUserId,
            type: NotificationType.BOOKING_TRIP_COMPLETED,
            title: 'Mission Fulfilled',
            body: 'Trip completed successfully. Earnings credited to your driver wallet.',
            data: { bookingId },
            idempotencyKey: `${event.id}-driver-trip-completed`,
          },
          db ?? prisma,
        );
      }
    },
  );

  eventHandlerRegistry.register(
    'booking.cancelled',
    async (event: OutboxEvent, payload: Record<string, unknown>, db?: Db) => {
      const customerId = payload.customerId as string;
      const driverUserId = payload.driverUserId as string;
      const bookingId = payload.bookingId as string;

      if (customerId) {
        await createNotification(
          {
            userId: customerId,
            type: NotificationType.BOOKING_CANCELLED,
            title: 'Booking Cancelled',
            body: 'Your booking has been cancelled.',
            data: { bookingId },
            idempotencyKey: `${event.id}-customer-cancelled`,
          },
          db ?? prisma,
        );
      }

      if (driverUserId) {
        await createNotification(
          {
            userId: driverUserId,
            type: NotificationType.BOOKING_CANCELLED,
            title: 'Trip Cancelled',
            body: 'The customer has cancelled this booking request.',
            data: { bookingId },
            idempotencyKey: `${event.id}-driver-cancelled`,
          },
          db ?? prisma,
        );
      }
    },
  );

  // -------------------------------------------------------------------------
  // Payment & Finance Events
  // -------------------------------------------------------------------------
  eventHandlerRegistry.register(
    'payment.captured',
    async (event: OutboxEvent, payload: Record<string, unknown>, db?: Db) => {
      const customerId = payload.customerId as string;
      const paymentId = payload.paymentId as string;
      const amount = payload.amount as string | number;

      if (customerId) {
        await createNotification(
          {
            userId: customerId,
            type: NotificationType.PAYMENT_CAPTURED,
            title: 'Payment Successful',
            body: `Payment of ₹${amount} received successfully. Receipt generated.`,
            data: { paymentId },
            idempotencyKey: `${event.id}-payment-captured`,
          },
          db ?? prisma,
        );
      }
    },
  );

  eventHandlerRegistry.register(
    'payment.refunded',
    async (event: OutboxEvent, payload: Record<string, unknown>, db?: Db) => {
      const customerId = payload.customerId as string;
      const amount = payload.amount as string | number;

      if (customerId) {
        await createNotification(
          {
            userId: customerId,
            type: NotificationType.PAYMENT_REFUNDED,
            title: 'Refund Processed',
            body: `Refund of ₹${amount} processed to your original payment method.`,
            data: payload,
            idempotencyKey: `${event.id}-payment-refunded`,
          },
          db ?? prisma,
        );
      }
    },
  );

  eventHandlerRegistry.register(
    'driver.earnings.recognized',
    async (event: OutboxEvent, payload: Record<string, unknown>, db?: Db) => {
      const driverUserId = payload.driverUserId as string;
      const amount = payload.driverEarningsAmount as string | number;

      if (driverUserId) {
        await createNotification(
          {
            userId: driverUserId,
            type: NotificationType.DRIVER_EARNINGS_RECOGNIZED,
            title: 'Earnings Credited',
            body: `₹${amount} credited to your available driver balance.`,
            data: payload,
            idempotencyKey: `${event.id}-earnings-credited`,
          },
          db ?? prisma,
        );
      }
    },
  );

  eventHandlerRegistry.register(
    'settlement.completed',
    async (event: OutboxEvent, payload: Record<string, unknown>, db?: Db) => {
      const driverUserId = payload.driverUserId as string;
      const amount = payload.amount as string | number;

      if (driverUserId) {
        await createNotification(
          {
            userId: driverUserId,
            type: NotificationType.SETTLEMENT_COMPLETED,
            title: 'Bank Settlement Paid',
            body: `Bank settlement payout of ₹${amount} completed via IMPS rails.`,
            data: payload,
            idempotencyKey: `${event.id}-settlement-paid`,
          },
          db ?? prisma,
        );
      }
    },
  );

  // -------------------------------------------------------------------------
  // Driver Onboarding Events
  // -------------------------------------------------------------------------
  eventHandlerRegistry.register(
    'driver.application.approved',
    async (event: OutboxEvent, payload: Record<string, unknown>, db?: Db) => {
      const driverUserId = payload.userId as string;
      if (driverUserId) {
        await createNotification(
          {
            userId: driverUserId,
            type: NotificationType.DRIVER_APPLICATION_APPROVED,
            title: 'Application Approved!',
            body: 'Congratulations! Your driver application has been approved. You can now go online.',
            data: payload,
            idempotencyKey: `${event.id}-app-approved`,
          },
          db ?? prisma,
        );
      }
    },
  );

  eventHandlerRegistry.register(
    'driver.document.verified',
    async (event: OutboxEvent, payload: Record<string, unknown>, db?: Db) => {
      const driverUserId = payload.userId as string;
      const documentType = payload.documentType as string;

      if (driverUserId) {
        await createNotification(
          {
            userId: driverUserId,
            type: NotificationType.DRIVER_DOCUMENT_VERIFIED,
            title: 'Document Verified',
            body: `Your document (${documentType}) has been verified by compliance auditors.`,
            data: payload,
            idempotencyKey: `${event.id}-doc-verified`,
          },
          db ?? prisma,
        );
      }
    },
  );

  // -------------------------------------------------------------------------
  // System Campaign Dispatch
  // -------------------------------------------------------------------------
  eventHandlerRegistry.register(
    'system.campaign.dispatch',
    async (_event: OutboxEvent, payload: Record<string, unknown>, db?: Db) => {
      const campaignId = payload.campaignId as string;
      if (campaignId) {
        await processCampaignDispatch(campaignId, db ?? prisma);
      }
    },
  );

  logger.info('Registered outbox notification event handlers');
}
