import { prisma } from '@/shared/database/prisma';
import { registerNotificationEventHandlers } from '@/worker/jobs/notification-event-handlers';
import { eventHandlerRegistry } from '@/worker/outbox/event-handler-registry';
import {
  createNotification,
  listUserNotifications,
  getUnreadNotificationCount,
  markNotificationAsRead,
} from '@/modules/notification/application/notification-service';

jest.mock('@/shared/database/prisma', () => ({
  prisma: {
    driverProfile: {
      findUnique: jest.fn(),
    },
    payment: {
      findUnique: jest.fn(),
    },
    notificationPreference: {
      findUnique: jest.fn(),
    },
    notification: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
    },
    notificationDelivery: {
      create: jest.fn(),
      update: jest.fn(),
    },
    userRole: {
      findMany: jest.fn(),
    },
    user: {
      findMany: jest.fn(),
    },
  },
}));

jest.mock('@/shared/logging/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

jest.mock('@/modules/notification/application/push-notification-service', () => ({
  sendPushToUser: jest.fn().mockResolvedValue({ totalSent: 1, successCount: 1, failureCount: 0 }),
}));

jest.mock('@/shared/realtime/realtime-provider', () => ({
  realtime: {
    publishBookingUpdate: jest.fn(),
  },
}));

const mockedPrisma = prisma as unknown as {
  driverProfile: { findUnique: jest.Mock };
  payment: { findUnique: jest.Mock };
  notificationPreference: { findUnique: jest.Mock };
  notification: {
    findUnique: jest.Mock;
    findMany: jest.Mock;
    count: jest.Mock;
    create: jest.Mock;
    update: jest.Mock;
    updateMany: jest.Mock;
  };
  notificationDelivery: { create: jest.Mock; update: jest.Mock };
};

describe('Phase 65 — Notification Reliability & Outbox Processing Unit Tests', () => {
  beforeAll(() => {
    registerNotificationEventHandlers();
  });

  beforeEach(() => {
    mockedPrisma.notificationPreference.findUnique.mockResolvedValue(null);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Outbox Event Handlers & Driver UserId Resolution', () => {
    it('resolves driverUserId from driverProfileId when driverUserId is absent in booking.driver.offered', async () => {
      mockedPrisma.driverProfile.findUnique.mockResolvedValue({ userId: 'driver-user-99' });
      mockedPrisma.notification.findUnique.mockResolvedValue(null);
      mockedPrisma.notification.create.mockResolvedValue({
        id: 'notif-1',
        userId: 'driver-user-99',
        type: 'BOOKING_DRIVER_OFFERED',
      });
      mockedPrisma.notificationDelivery.create.mockResolvedValue({ id: 'deliv-1' });

      const handler = eventHandlerRegistry.getHandler('booking.driver.offered');
      expect(handler).toBeDefined();

      const outboxEvent = {
        id: 'evt-100',
        eventType: 'booking.driver.offered',
        aggregateType: 'BookingAssignmentAttempt',
        aggregateId: 'attempt-1',
        payload: {
          bookingId: 'booking-100',
          driverProfileId: 'driver-profile-99',
        },
      } as unknown as Parameters<
        NonNullable<ReturnType<typeof eventHandlerRegistry.getHandler>>
      >[0];

      await handler!(outboxEvent, outboxEvent.payload as Record<string, unknown>, prisma);

      expect(mockedPrisma.driverProfile.findUnique).toHaveBeenCalledWith({
        where: { id: 'driver-profile-99' },
        select: { userId: true },
      });

      expect(mockedPrisma.notification.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            userId: 'driver-user-99',
            type: 'BOOKING_DRIVER_OFFERED',
          }),
        }),
      );
    });

    it('resolves driverUserId from driverProfileId when driverUserId is absent in booking.driver.assigned', async () => {
      mockedPrisma.driverProfile.findUnique.mockResolvedValue({ userId: 'driver-user-77' });
      mockedPrisma.notification.findUnique.mockResolvedValue(null);
      mockedPrisma.notification.create.mockResolvedValue({
        id: 'notif-2',
        userId: 'driver-user-77',
        type: 'BOOKING_DRIVER_ASSIGNED',
      });
      mockedPrisma.notificationDelivery.create.mockResolvedValue({ id: 'deliv-2' });

      const handler = eventHandlerRegistry.getHandler('booking.driver.assigned');
      expect(handler).toBeDefined();

      const outboxEvent = {
        id: 'evt-101',
        eventType: 'booking.driver.assigned',
        aggregateType: 'Booking',
        aggregateId: 'booking-200',
        payload: {
          bookingId: 'booking-200',
          customerId: 'customer-user-1',
          driverProfileId: 'driver-profile-77',
        },
      } as unknown as Parameters<
        NonNullable<ReturnType<typeof eventHandlerRegistry.getHandler>>
      >[0];

      await handler!(outboxEvent, outboxEvent.payload as Record<string, unknown>, prisma);

      expect(mockedPrisma.driverProfile.findUnique).toHaveBeenCalledWith({
        where: { id: 'driver-profile-77' },
        select: { userId: true },
      });

      expect(mockedPrisma.notification.create).toHaveBeenCalledTimes(2); // One for customer, one for driver
    });

    it('resolves customerId from payment record when customerId is absent in payment.refunded', async () => {
      mockedPrisma.payment.findUnique.mockResolvedValue({
        id: 'pay-500',
        customerId: 'customer-user-refund',
        booking: { customerId: 'customer-user-refund' },
      });
      mockedPrisma.notification.findUnique.mockResolvedValue(null);
      mockedPrisma.notification.create.mockResolvedValue({
        id: 'notif-ref-1',
        userId: 'customer-user-refund',
        type: 'PAYMENT_REFUNDED',
      });
      mockedPrisma.notificationDelivery.create.mockResolvedValue({ id: 'deliv-ref-1' });

      const handler = eventHandlerRegistry.getHandler('payment.refunded');
      expect(handler).toBeDefined();

      const outboxEvent = {
        id: 'evt-refund-1',
        eventType: 'payment.refunded',
        aggregateType: 'Payment',
        aggregateId: 'pay-500',
        payload: {
          paymentId: 'pay-500',
          refundId: 'refund-1',
          amount: '250.0000',
          newPaymentStatus: 'REFUNDED',
        },
      } as unknown as Parameters<
        NonNullable<ReturnType<typeof eventHandlerRegistry.getHandler>>
      >[0];

      await handler!(outboxEvent, outboxEvent.payload as Record<string, unknown>, prisma);

      expect(mockedPrisma.payment.findUnique).toHaveBeenCalledWith({
        where: { id: 'pay-500' },
        select: { customerId: true, booking: { select: { customerId: true } } },
      });

      expect(mockedPrisma.notification.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            userId: 'customer-user-refund',
            type: 'PAYMENT_REFUNDED',
          }),
        }),
      );
    });
  });

  describe('Notification Persistence & Read/Unread State', () => {
    it('prevents duplicate notification creation via idempotencyKey', async () => {
      const existingNotif = {
        id: 'existing-notif-1',
        userId: 'user-1',
        idempotencyKey: 'dup-key-1',
      };
      mockedPrisma.notification.findUnique.mockResolvedValue(existingNotif);

      const result = await createNotification(
        {
          userId: 'user-1',
          type: 'BOOKING_CREATED',
          title: 'Booking Created',
          body: 'Your trip request was created.',
          idempotencyKey: 'dup-key-1',
        },
        prisma,
      );

      expect(result).toEqual(existingNotif);
      expect(mockedPrisma.notification.create).not.toHaveBeenCalled();
    });

    it('lists notifications for a user with correct filters', async () => {
      const notifList = [
        { id: 'n1', userId: 'user-1', status: 'UNREAD' },
        { id: 'n2', userId: 'user-1', status: 'READ' },
      ];
      mockedPrisma.notification.findMany.mockResolvedValue(notifList);
      mockedPrisma.notification.count.mockResolvedValue(2);
      mockedPrisma.notification.findMany.mockResolvedValue(notifList);
      mockedPrisma.notification.count.mockResolvedValue(2);

      const res = await listUserNotifications({ userId: 'user-1', limit: 10, offset: 0 }, prisma);

      expect(res.items).toEqual(notifList);
      expect(res.total).toBe(2);
    });

    it('marks an unread notification as read', async () => {
      mockedPrisma.notification.findUnique.mockResolvedValue({
        id: 'n1',
        userId: 'user-1',
        status: 'UNREAD',
      });
      mockedPrisma.notification.update.mockResolvedValue({
        id: 'n1',
        userId: 'user-1',
        status: 'READ',
        readAt: new Date(),
      });

      const updated = await markNotificationAsRead('user-1', 'n1', prisma);

      expect(updated?.status).toBe('READ');
      expect(mockedPrisma.notification.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'n1' },
          data: expect.objectContaining({ status: 'READ' }),
        }),
      );
    });

    it('returns unread count accurately', async () => {
      mockedPrisma.notification.count.mockResolvedValue(3);

      const count = await getUnreadNotificationCount('user-1', prisma);

      expect(count).toBe(3);
      expect(mockedPrisma.notification.count).toHaveBeenCalledWith({
        where: { userId: 'user-1', status: 'UNREAD' },
      });
    });
  });
});
