import { OutboxEvent, NotificationType } from '@prisma/client';
import { logger } from '@/shared/logging/logger';
import { prisma, type Db } from '@/shared/database/prisma';
import { eventHandlerRegistry } from '../outbox/event-handler-registry';
import { createNotification } from '@/modules/notification/application/notification-service';
import { processCampaignDispatch } from '@/modules/notification/application/notification-campaign-service';

/**
 * Fans a notification out to every currently-active ADMINISTRATOR — there
 * is no "broadcast to all admins" primitive elsewhere in the app (the
 * notification-campaign system's audiences are ALL_CUSTOMERS/ALL_DRIVERS/
 * ALL_USERS/SELECTED_USERS, none of which target a role). The admin
 * population is always small, so this is a bounded fan-out, not the
 * campaign-scale broadcast notification-campaign-service.ts already
 * batches for potentially thousands of recipients.
 */
async function notifyAdministrators(
  input: { type: NotificationType; title: string; body: string; data: Record<string, unknown> },
  event: OutboxEvent,
  db: Db,
): Promise<void> {
  const admins = await db.userRole.findMany({
    where: { role: { code: 'ADMINISTRATOR' }, revokedAt: null },
    select: { userId: true },
  });
  for (const admin of admins) {
    await createNotification(
      {
        userId: admin.userId,
        type: input.type,
        title: input.title,
        body: input.body,
        data: input.data,
        idempotencyKey: `${event.id}-admin-${admin.userId}`,
      },
      db,
    );
  }
}

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

  eventHandlerRegistry.register(
    'booking.search.expired',
    async (event: OutboxEvent, payload: Record<string, unknown>, db?: Db) => {
      const bookingId = payload.bookingId as string;
      if (!bookingId) return;
      const client = db ?? prisma;

      const booking = await client.booking.findUnique({
        where: { id: bookingId },
        select: { customerId: true },
      });
      if (!booking) return;

      await createNotification(
        {
          userId: booking.customerId,
          type: NotificationType.BOOKING_EXPIRED,
          title: 'No Chauffeur Found',
          body: 'We could not find an available chauffeur in time. Please try booking again.',
          data: { bookingId },
          idempotencyKey: `${event.id}-search-expired`,
        },
        client,
      );
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
      // completeSettlement's outbox payload carries driverProfileId, not
      // driverUserId (there is no such field) — this handler previously
      // read payload.driverUserId directly, which was always undefined, so
      // this notification silently never fired. Fixed to resolve the
      // userId the same way the sibling settlement.created/settlement.failed
      // handlers already correctly do.
      const driverProfileId = payload.driverProfileId as string;
      const amount = payload.amount as string | number;
      if (!driverProfileId) return;
      const client = db ?? prisma;

      const profile = await client.driverProfile.findUnique({
        where: { id: driverProfileId },
        select: { userId: true },
      });
      if (!profile) return;

      await createNotification(
        {
          userId: profile.userId,
          type: NotificationType.SETTLEMENT_COMPLETED,
          title: 'Settlement Paid',
          body: `Your settlement payout of ₹${amount} has been completed.`,
          data: payload,
          idempotencyKey: `${event.id}-settlement-paid`,
        },
        client,
      );
    },
  );

  eventHandlerRegistry.register(
    'settlement.created',
    async (event: OutboxEvent, payload: Record<string, unknown>, db?: Db) => {
      const driverProfileId = payload.driverProfileId as string;
      const amount = payload.amount as string | number;
      if (!driverProfileId) return;
      const client = db ?? prisma;

      const profile = await client.driverProfile.findUnique({
        where: { id: driverProfileId },
        select: { userId: true },
      });
      if (!profile) return;

      await createNotification(
        {
          userId: profile.userId,
          type: NotificationType.SETTLEMENT_CREATED,
          title: 'Settlement Reserved',
          body: `A settlement of ₹${amount} has been reserved and is awaiting payout.`,
          data: payload,
          idempotencyKey: `${event.id}-settlement-created`,
        },
        client,
      );
    },
  );

  eventHandlerRegistry.register(
    'settlement.failed',
    async (event: OutboxEvent, payload: Record<string, unknown>, db?: Db) => {
      const driverProfileId = payload.driverProfileId as string;
      const reason = payload.reason as string | undefined;
      if (!driverProfileId) return;
      const client = db ?? prisma;

      const profile = await client.driverProfile.findUnique({
        where: { id: driverProfileId },
        select: { userId: true },
      });
      if (!profile) return;

      await createNotification(
        {
          userId: profile.userId,
          type: NotificationType.SETTLEMENT_FAILED,
          title: 'Settlement Failed',
          body: reason
            ? `Your settlement payout failed: ${reason}`
            : 'Your settlement payout failed and is being reviewed.',
          data: payload,
          idempotencyKey: `${event.id}-settlement-failed`,
        },
        client,
      );

      // "Admin: Large settlement failure" — a failed payout is exactly the
      // kind of financial event ops should see without having to poll the
      // settlements page.
      await notifyAdministrators(
        {
          type: NotificationType.SETTLEMENT_FAILED,
          title: 'Driver Settlement Failed',
          body: reason
            ? `A driver settlement failed: ${reason}`
            : 'A driver settlement failed and needs review.',
          data: payload,
        },
        event,
        client,
      );
    },
  );

  eventHandlerRegistry.register(
    'settlement.retried',
    async (event: OutboxEvent, payload: Record<string, unknown>, db?: Db) => {
      const driverProfileId = payload.driverProfileId as string;
      if (!driverProfileId) return;
      const client = db ?? prisma;

      const profile = await client.driverProfile.findUnique({
        where: { id: driverProfileId },
        select: { userId: true },
      });
      if (!profile) return;

      await createNotification(
        {
          userId: profile.userId,
          type: NotificationType.SETTLEMENT_CREATED,
          title: 'Settlement Retried',
          body: 'Your failed settlement is being retried and is awaiting payout again.',
          data: payload,
          idempotencyKey: `${event.id}-settlement-retried`,
        },
        client,
      );
    },
  );

  eventHandlerRegistry.register(
    'promotion.redeemed',
    async (event: OutboxEvent, payload: Record<string, unknown>, db?: Db) => {
      // booking-service.ts's payload carries customerId directly (it's
      // already a User id, unlike driverProfileId elsewhere in this file) —
      // no profile lookup needed.
      const customerId = payload.customerId as string;
      const discountAmount = payload.discountAmount as string | number;
      if (!customerId) return;
      const client = db ?? prisma;

      await createNotification(
        {
          userId: customerId,
          type: NotificationType.SYSTEM_COUPON,
          title: 'Promo Code Applied',
          body: `You saved ₹${discountAmount} on this booking.`,
          data: payload,
          idempotencyKey: `${event.id}-promotion-redeemed`,
        },
        client,
      );
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
  // Dispatch Operations Events
  // -------------------------------------------------------------------------
  eventHandlerRegistry.register(
    'dispatch.driver.reassigned',
    async (event: OutboxEvent, payload: Record<string, unknown>, db?: Db) => {
      const bookingId = payload.bookingId as string;
      const previousDriverProfileId = payload.previousDriverProfileId as string | undefined;
      if (!bookingId) return;
      const client = db ?? prisma;

      const booking = await client.booking.findUnique({
        where: { id: bookingId },
        select: { customerId: true },
      });
      if (booking) {
        await createNotification(
          {
            userId: booking.customerId,
            type: NotificationType.SYSTEM_ANNOUNCEMENT,
            title: 'Finding You a New Chauffeur',
            body: 'Your previously assigned driver was reassigned by our operations team. We are matching you with another driver now.',
            data: { bookingId },
            idempotencyKey: `${event.id}-customer-reassigned`,
          },
          client,
        );
      }

      if (previousDriverProfileId) {
        const previousProfile = await client.driverProfile.findUnique({
          where: { id: previousDriverProfileId },
          select: { userId: true },
        });
        if (previousProfile) {
          await createNotification(
            {
              userId: previousProfile.userId,
              type: NotificationType.SYSTEM_ANNOUNCEMENT,
              title: 'Trip Reassigned',
              body: 'This trip was reassigned by our operations team. You have been released back to available status.',
              data: { bookingId },
              idempotencyKey: `${event.id}-driver-reassigned`,
            },
            client,
          );
        }
      }
    },
  );

  eventHandlerRegistry.register(
    'dispatch.search.restarted',
    async (event: OutboxEvent, payload: Record<string, unknown>, db?: Db) => {
      const bookingId = payload.bookingId as string;
      if (!bookingId) return;
      const client = db ?? prisma;

      const booking = await client.booking.findUnique({
        where: { id: bookingId },
        select: { customerId: true },
      });
      if (!booking) return;

      await createNotification(
        {
          userId: booking.customerId,
          type: NotificationType.SYSTEM_ANNOUNCEMENT,
          title: 'Still Looking for Your Chauffeur',
          body: 'Our operations team has restarted the search for your booking.',
          data: { bookingId },
          idempotencyKey: `${event.id}-search-restarted`,
        },
        client,
      );
    },
  );

  eventHandlerRegistry.register(
    'dispatch.driver.force_assigned',
    async (event: OutboxEvent, payload: Record<string, unknown>, db?: Db) => {
      const bookingId = payload.bookingId as string;
      const driverProfileId = payload.driverProfileId as string | undefined;
      const previousDriverProfileId = payload.previousDriverProfileId as string | undefined;
      if (!bookingId) return;
      const client = db ?? prisma;

      const booking = await client.booking.findUnique({
        where: { id: bookingId },
        select: { customerId: true },
      });
      if (booking) {
        await createNotification(
          {
            userId: booking.customerId,
            type: NotificationType.SYSTEM_ANNOUNCEMENT,
            title: 'Chauffeur Assigned!',
            body: 'A driver has been assigned to your booking by our operations team.',
            data: { bookingId },
            idempotencyKey: `${event.id}-customer-force-assigned`,
          },
          client,
        );
      }

      if (driverProfileId) {
        const newProfile = await client.driverProfile.findUnique({
          where: { id: driverProfileId },
          select: { userId: true },
        });
        if (newProfile) {
          await createNotification(
            {
              userId: newProfile.userId,
              type: NotificationType.SYSTEM_ANNOUNCEMENT,
              title: 'Trip Assignment Confirmed',
              body: 'Our operations team has assigned you to a trip. Tap to view details.',
              data: { bookingId },
              idempotencyKey: `${event.id}-driver-force-assigned`,
            },
            client,
          );
        }
      }

      if (previousDriverProfileId) {
        const previousProfile = await client.driverProfile.findUnique({
          where: { id: previousDriverProfileId },
          select: { userId: true },
        });
        if (previousProfile) {
          await createNotification(
            {
              userId: previousProfile.userId,
              type: NotificationType.SYSTEM_ANNOUNCEMENT,
              title: 'Trip Reassigned',
              body: 'This trip was reassigned by our operations team. You have been released back to available status.',
              data: { bookingId },
              idempotencyKey: `${event.id}-previous-driver-force-assigned`,
            },
            client,
          );
        }
      }
    },
  );

  eventHandlerRegistry.register(
    'dispatch.booking.cancelled',
    async (event: OutboxEvent, payload: Record<string, unknown>, db?: Db) => {
      const bookingId = payload.bookingId as string;
      const previousDriverProfileId = payload.previousDriverProfileId as string | undefined;
      const reason = (payload.reason as string) || 'Cancelled by operations operator';
      if (!bookingId) return;
      const client = db ?? prisma;

      const booking = await client.booking.findUnique({
        where: { id: bookingId },
        select: { customerId: true },
      });
      if (booking) {
        await createNotification(
          {
            userId: booking.customerId,
            type: NotificationType.BOOKING_CANCELLED,
            title: 'Booking Cancelled by Dispatch',
            body: `Your booking was cancelled by operations support. Reason: ${reason}`,
            data: { bookingId, reason },
            idempotencyKey: `${event.id}-customer-dispatch-cancelled`,
          },
          client,
        );
      }

      if (previousDriverProfileId) {
        const previousProfile = await client.driverProfile.findUnique({
          where: { id: previousDriverProfileId },
          select: { userId: true },
        });
        if (previousProfile) {
          await createNotification(
            {
              userId: previousProfile.userId,
              type: NotificationType.BOOKING_CANCELLED,
              title: 'Assigned Trip Cancelled',
              body: `The trip you were assigned to was cancelled by operations support. You are now available for new offers.`,
              data: { bookingId, reason },
              idempotencyKey: `${event.id}-driver-dispatch-cancelled`,
            },
            client,
          );
        }
      }
    },
  );

  // -------------------------------------------------------------------------
  // Reviews & Ratings Events
  // -------------------------------------------------------------------------
  eventHandlerRegistry.register(
    'review.created',
    async (event: OutboxEvent, payload: Record<string, unknown>, db?: Db) => {
      const driverProfileId = payload.driverProfileId as string | undefined;
      const rating = payload.rating as number | undefined;
      if (!driverProfileId || !rating) return;
      const client = db ?? prisma;

      const driverProfile = await client.driverProfile.findUnique({
        where: { id: driverProfileId },
        select: { userId: true },
      });
      if (!driverProfile) return;

      await createNotification(
        {
          userId: driverProfile.userId,
          type: NotificationType.DRIVER_RATING_RECEIVED,
          title: 'You Received a New Rating',
          body: `A customer rated your recent trip ${rating} out of 5 stars.`,
          data: { reviewId: payload.reviewId, rating },
          idempotencyKey: `${event.id}-driver-rating-received`,
        },
        client,
      );
    },
  );

  eventHandlerRegistry.register(
    'review.moderated',
    async (event: OutboxEvent, payload: Record<string, unknown>, db?: Db) => {
      const customerUserId = payload.customerUserId as string | undefined;
      const newStatus = payload.newStatus as string | undefined;
      if (!customerUserId || !newStatus) return;
      const client = db ?? prisma;

      const statusMessage =
        newStatus === 'PUBLISHED'
          ? 'Your review is visible again after moderation review.'
          : 'Your review is no longer publicly visible following a moderation review.';

      await createNotification(
        {
          userId: customerUserId,
          type: NotificationType.REVIEW_MODERATED,
          title: 'Your Review Was Moderated',
          body: statusMessage,
          data: { reviewId: payload.reviewId, newStatus },
          idempotencyKey: `${event.id}-review-moderated`,
        },
        client,
      );
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
