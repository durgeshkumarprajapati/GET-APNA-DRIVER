import { OutboxDispatcherService } from '@/worker/outbox/outbox-dispatcher-service';
import { registerNotificationEventHandlers } from '@/worker/jobs/notification-event-handlers';
import { OutboxEvent, OutboxEventStatus, NotificationType } from '@prisma/client';

interface MockDb {
  $queryRaw: jest.Mock;
  outboxEvent: {
    update: jest.Mock;
  };
  notification: {
    findUnique: jest.Mock;
    create: jest.Mock;
  };
  notificationDelivery: {
    create: jest.Mock;
    update: jest.Mock;
  };
  notificationPreference: {
    findUnique: jest.Mock;
  };
  pushSubscription: {
    findMany: jest.Mock;
  };
  systemConfiguration: {
    findUnique: jest.Mock;
  };
}

describe('Notification Integration Flow', () => {
  let dispatcher: OutboxDispatcherService;
  let mockDb: MockDb;

  beforeEach(() => {
    dispatcher = new OutboxDispatcherService('integration-test-worker');
    registerNotificationEventHandlers();

    mockDb = {
      $queryRaw: jest.fn(),
      outboxEvent: {
        update: jest.fn().mockResolvedValue({}),
      },
      notification: {
        findUnique: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockResolvedValue({ id: 'notif-int-1' }),
      },
      notificationDelivery: {
        create: jest.fn().mockResolvedValue({ id: 'del-int-1' }),
        update: jest.fn().mockResolvedValue({ id: 'del-int-1' }),
      },
      notificationPreference: {
        findUnique: jest.fn(),
      },
      pushSubscription: {
        findMany: jest.fn().mockResolvedValue([]),
      },
      systemConfiguration: {
        findUnique: jest.fn().mockResolvedValue(null),
      },
    };
  });

  it('processes booking.driver.assigned outbox event and creates notifications for customer & driver', async () => {
    const outboxEvent = {
      id: 'outbox-assigned-1',
      eventType: 'booking.driver.assigned',
      aggregateType: 'Booking',
      aggregateId: 'booking-99',
      payload: {
        bookingId: 'booking-99',
        customerId: 'cust-10',
        driverUserId: 'driver-20',
      },
      status: OutboxEventStatus.PROCESSING,
      attempts: 1,
      availableAt: new Date(),
      lastAttemptAt: null,
      lockedAt: new Date(),
      lockedBy: 'integration-test-worker',
      lastError: null,
      processedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as unknown as OutboxEvent;

    const success = await dispatcher.processEvent(
      outboxEvent,
      { maxAttempts: 3 },
      mockDb as unknown as Parameters<typeof dispatcher.processEvent>[2],
    );

    expect(success).toBe(true);

    // Should create notification for customer and notification for driver
    expect(mockDb.notification.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          userId: 'cust-10',
          type: NotificationType.BOOKING_DRIVER_ASSIGNED,
          title: 'Chauffeur Assigned!',
        }),
      }),
    );

    expect(mockDb.notification.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          userId: 'driver-20',
          type: NotificationType.BOOKING_DRIVER_ASSIGNED,
          title: 'Trip Assignment Confirmed',
        }),
      }),
    );
  });

  it('processes payment.captured outbox event and creates payment notification for customer', async () => {
    const outboxEvent = {
      id: 'outbox-payment-1',
      eventType: 'payment.captured',
      aggregateType: 'Payment',
      aggregateId: 'pay-77',
      payload: {
        paymentId: 'pay-77',
        customerId: 'cust-10',
        amount: 4200,
      },
      status: OutboxEventStatus.PROCESSING,
      attempts: 1,
      availableAt: new Date(),
      lastAttemptAt: null,
      lockedAt: new Date(),
      lockedBy: 'integration-test-worker',
      lastError: null,
      processedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as unknown as OutboxEvent;

    const success = await dispatcher.processEvent(
      outboxEvent,
      { maxAttempts: 3 },
      mockDb as unknown as Parameters<typeof dispatcher.processEvent>[2],
    );

    expect(success).toBe(true);
    expect(mockDb.notification.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          userId: 'cust-10',
          type: NotificationType.PAYMENT_CAPTURED,
          title: 'Payment Successful',
        }),
      }),
    );
  });
});
