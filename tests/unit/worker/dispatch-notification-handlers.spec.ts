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
