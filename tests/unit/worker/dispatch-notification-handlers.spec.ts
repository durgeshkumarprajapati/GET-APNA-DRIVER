jest.mock('@/modules/notification/application/notification-service', () => ({
  createNotification: jest.fn(),
}));
jest.mock('@/modules/notification/application/notification-campaign-service', () => ({
  processCampaignDispatch: jest.fn(),
}));
jest.mock('@/shared/database/prisma', () => ({
  prisma: {
    booking: { findUnique: jest.fn() },
    driverProfile: { findUnique: jest.fn() },
    userRole: { findMany: jest.fn() },
  },
}));

import { registerNotificationEventHandlers } from '@/worker/jobs/notification-event-handlers';
import { eventHandlerRegistry } from '@/worker/outbox/event-handler-registry';
import { createNotification } from '@/modules/notification/application/notification-service';
import { prisma } from '@/shared/database/prisma';

function fakeEvent(id: string) {
  return { id } as never;
}

describe('dispatch outbox notification handlers', () => {
  beforeAll(() => {
    registerNotificationEventHandlers();
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('registers all three dispatch event types', () => {
    expect(eventHandlerRegistry.hasHandler('dispatch.driver.reassigned')).toBe(true);
    expect(eventHandlerRegistry.hasHandler('dispatch.search.restarted')).toBe(true);
    expect(eventHandlerRegistry.hasHandler('dispatch.driver.force_assigned')).toBe(true);
  });

  it('dispatch.driver.reassigned notifies the customer and the released driver', async () => {
    (prisma.booking.findUnique as jest.Mock).mockResolvedValue({ customerId: 'customer-1' });
    (prisma.driverProfile.findUnique as jest.Mock).mockResolvedValue({ userId: 'driver-user-1' });

    const handler = eventHandlerRegistry.getHandler('dispatch.driver.reassigned')!;
    await handler(
      fakeEvent('evt-1'),
      { bookingId: 'booking-1', previousDriverProfileId: 'driver-profile-1' },
      prisma as never,
    );

    expect(createNotification).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'customer-1',
        idempotencyKey: 'evt-1-customer-reassigned',
      }),
      prisma,
    );
    expect(createNotification).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'driver-user-1',
        idempotencyKey: 'evt-1-driver-reassigned',
      }),
      prisma,
    );
  });

  it('dispatch.search.restarted notifies only the customer', async () => {
    (prisma.booking.findUnique as jest.Mock).mockResolvedValue({ customerId: 'customer-1' });

    const handler = eventHandlerRegistry.getHandler('dispatch.search.restarted')!;
    await handler(fakeEvent('evt-2'), { bookingId: 'booking-1' }, prisma as never);

    expect(createNotification).toHaveBeenCalledTimes(1);
    expect(createNotification).toHaveBeenCalledWith(
      expect.objectContaining({ userId: 'customer-1' }),
      prisma,
    );
  });

  it('dispatch.search.restarted is a no-op when the booking no longer exists', async () => {
    (prisma.booking.findUnique as jest.Mock).mockResolvedValue(null);

    const handler = eventHandlerRegistry.getHandler('dispatch.search.restarted')!;
    await handler(fakeEvent('evt-3'), { bookingId: 'missing' }, prisma as never);

    expect(createNotification).not.toHaveBeenCalled();
  });

  it('dispatch.driver.force_assigned notifies the customer, the new driver, and the released driver', async () => {
    (prisma.booking.findUnique as jest.Mock).mockResolvedValue({ customerId: 'customer-1' });
    (prisma.driverProfile.findUnique as jest.Mock).mockImplementation(({ where }) =>
      Promise.resolve({
        userId: where.id === 'driver-new' ? 'new-driver-user' : 'old-driver-user',
      }),
    );

    const handler = eventHandlerRegistry.getHandler('dispatch.driver.force_assigned')!;
    await handler(
      fakeEvent('evt-4'),
      {
        bookingId: 'booking-1',
        driverProfileId: 'driver-new',
        previousDriverProfileId: 'driver-old',
      },
      prisma as never,
    );

    expect(createNotification).toHaveBeenCalledTimes(3);
    expect(createNotification).toHaveBeenCalledWith(
      expect.objectContaining({ userId: 'customer-1' }),
      prisma,
    );
    expect(createNotification).toHaveBeenCalledWith(
      expect.objectContaining({ userId: 'new-driver-user' }),
      prisma,
    );
    expect(createNotification).toHaveBeenCalledWith(
      expect.objectContaining({ userId: 'old-driver-user' }),
      prisma,
    );
  });
});

describe('review outbox notification handlers', () => {
  beforeAll(() => {
    registerNotificationEventHandlers();
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('registers both review event types', () => {
    expect(eventHandlerRegistry.hasHandler('review.created')).toBe(true);
    expect(eventHandlerRegistry.hasHandler('review.moderated')).toBe(true);
  });

  it('review.created notifies the reviewed driver', async () => {
    (prisma.driverProfile.findUnique as jest.Mock).mockResolvedValue({ userId: 'driver-user-1' });

    const handler = eventHandlerRegistry.getHandler('review.created')!;
    await handler(
      fakeEvent('evt-5'),
      { reviewId: 'review-1', driverProfileId: 'driver-profile-1', rating: 5 },
      prisma as never,
    );

    expect(createNotification).toHaveBeenCalledTimes(1);
    expect(createNotification).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'driver-user-1',
        idempotencyKey: 'evt-5-driver-rating-received',
      }),
      prisma,
    );
  });

  it('review.created is a no-op when the driver profile no longer exists', async () => {
    (prisma.driverProfile.findUnique as jest.Mock).mockResolvedValue(null);

    const handler = eventHandlerRegistry.getHandler('review.created')!;
    await handler(
      fakeEvent('evt-6'),
      { reviewId: 'review-1', driverProfileId: 'missing', rating: 3 },
      prisma as never,
    );

    expect(createNotification).not.toHaveBeenCalled();
  });

  it('review.moderated notifies the reviewing customer', async () => {
    const handler = eventHandlerRegistry.getHandler('review.moderated')!;
    await handler(
      fakeEvent('evt-7'),
      { reviewId: 'review-1', customerUserId: 'customer-1', newStatus: 'HIDDEN' },
      prisma as never,
    );

    expect(createNotification).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'customer-1',
        idempotencyKey: 'evt-7-review-moderated',
      }),
      prisma,
    );
  });
});

describe('settlement outbox notification handlers', () => {
  beforeAll(() => {
    registerNotificationEventHandlers();
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('registers all settlement event types', () => {
    expect(eventHandlerRegistry.hasHandler('settlement.created')).toBe(true);
    expect(eventHandlerRegistry.hasHandler('settlement.completed')).toBe(true);
    expect(eventHandlerRegistry.hasHandler('settlement.failed')).toBe(true);
    expect(eventHandlerRegistry.hasHandler('settlement.retried')).toBe(true);
  });

  it('settlement.completed resolves driverProfileId to a userId and notifies the driver', async () => {
    (prisma.driverProfile.findUnique as jest.Mock).mockResolvedValue({ userId: 'driver-user-1' });

    const handler = eventHandlerRegistry.getHandler('settlement.completed')!;
    await handler(
      fakeEvent('evt-settlement-completed'),
      { driverProfileId: 'driver-profile-1', amount: '500.0000' },
      prisma as never,
    );

    expect(prisma.driverProfile.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'driver-profile-1' } }),
    );
    expect(createNotification).toHaveBeenCalledTimes(1);
    expect(createNotification).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'driver-user-1',
        idempotencyKey: 'evt-settlement-completed-settlement-paid',
        body: expect.stringContaining('500.0000'),
      }),
      prisma,
    );
  });

  it('settlement.completed is a no-op when the driver profile no longer exists', async () => {
    (prisma.driverProfile.findUnique as jest.Mock).mockResolvedValue(null);

    const handler = eventHandlerRegistry.getHandler('settlement.completed')!;
    await handler(
      fakeEvent('evt-settlement-completed-missing'),
      { driverProfileId: 'missing', amount: '500.0000' },
      prisma as never,
    );

    expect(createNotification).not.toHaveBeenCalled();
  });

  it('settlement.failed notifies both the driver and every active administrator', async () => {
    (prisma.driverProfile.findUnique as jest.Mock).mockResolvedValue({ userId: 'driver-user-1' });
    (prisma.userRole.findMany as jest.Mock).mockResolvedValue([
      { userId: 'admin-1' },
      { userId: 'admin-2' },
    ]);

    const handler = eventHandlerRegistry.getHandler('settlement.failed')!;
    await handler(
      fakeEvent('evt-settlement-failed'),
      { driverProfileId: 'driver-profile-1', reason: 'Payout provider rejected the transfer' },
      prisma as never,
    );

    expect(prisma.userRole.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { role: { code: 'ADMINISTRATOR' }, revokedAt: null },
      }),
    );
    expect(createNotification).toHaveBeenCalledTimes(3);
    expect(createNotification).toHaveBeenCalledWith(
      expect.objectContaining({ userId: 'driver-user-1' }),
      prisma,
    );
    expect(createNotification).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'admin-1',
        idempotencyKey: 'evt-settlement-failed-admin-admin-1',
      }),
      prisma,
    );
    expect(createNotification).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'admin-2',
        idempotencyKey: 'evt-settlement-failed-admin-admin-2',
      }),
      prisma,
    );
  });

  it('settlement.retried notifies the driver that a new settlement is awaiting payout', async () => {
    (prisma.driverProfile.findUnique as jest.Mock).mockResolvedValue({ userId: 'driver-user-1' });

    const handler = eventHandlerRegistry.getHandler('settlement.retried')!;
    await handler(
      fakeEvent('evt-settlement-retried'),
      { driverProfileId: 'driver-profile-1' },
      prisma as never,
    );

    expect(createNotification).toHaveBeenCalledTimes(1);
    expect(createNotification).toHaveBeenCalledWith(
      expect.objectContaining({ userId: 'driver-user-1', type: 'SETTLEMENT_CREATED' }),
      prisma,
    );
  });
});

describe('promotion outbox notification handlers', () => {
  beforeAll(() => {
    registerNotificationEventHandlers();
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('registers the promotion.redeemed event type', () => {
    expect(eventHandlerRegistry.hasHandler('promotion.redeemed')).toBe(true);
  });

  it('promotion.redeemed notifies the customer directly (customerId is already a User id, no profile lookup)', async () => {
    const handler = eventHandlerRegistry.getHandler('promotion.redeemed')!;
    await handler(
      fakeEvent('evt-promotion-redeemed'),
      {
        bookingId: 'booking-1',
        customerId: 'customer-1',
        promotionId: 'promotion-1',
        promotionCodeSnapshot: 'SAVE20',
        discountAmount: '200.0000',
      },
      prisma as never,
    );

    expect(prisma.driverProfile.findUnique).not.toHaveBeenCalled();
    expect(createNotification).toHaveBeenCalledTimes(1);
    expect(createNotification).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'customer-1',
        type: 'SYSTEM_COUPON',
        idempotencyKey: 'evt-promotion-redeemed-promotion-redeemed',
        body: expect.stringContaining('200.0000'),
      }),
      prisma,
    );
  });

  it('promotion.redeemed is a no-op when the payload has no customerId', async () => {
    const handler = eventHandlerRegistry.getHandler('promotion.redeemed')!;
    await handler(
      fakeEvent('evt-promotion-redeemed-missing'),
      { bookingId: 'booking-1' },
      prisma as never,
    );

    expect(createNotification).not.toHaveBeenCalled();
  });
});
