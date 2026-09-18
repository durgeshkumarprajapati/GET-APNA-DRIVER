jest.mock('@/modules/notification/application/push-notification-service', () => ({
  sendPushToUser: jest.fn().mockResolvedValue({ totalSent: 1, totalFailed: 0 }),
}));

import { createNotification } from '@/modules/notification/application/notification-service';
import { sendPushToUser } from '@/modules/notification/application/push-notification-service';
import { NotificationType } from '@prisma/client';

describe('NotificationService - push payload (actionUrl + tag propagation)', () => {
  const mockSendPushToUser = sendPushToUser as jest.Mock;

  let mockDb: Record<string, Record<string, jest.Mock>>;

  beforeEach(() => {
    jest.clearAllMocks();
    mockSendPushToUser.mockResolvedValue({ totalSent: 1, totalFailed: 0 });
    mockDb = {
      notification: {
        findUnique: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockImplementation((args: { data: Record<string, unknown> }) =>
          Promise.resolve({ id: 'notif-1', ...args.data, createdAt: new Date(), updatedAt: new Date() }),
        ),
      },
      notificationDelivery: {
        create: jest.fn().mockResolvedValue({ id: 'del-1' }),
        update: jest.fn(),
      },
      notificationPreference: {
        findUnique: jest.fn().mockResolvedValue(null),
      },
    };
  });

  it('includes the resolved actionUrl inside the push payload data, so the service worker can open the exact right page on click', async () => {
    await createNotification(
      {
        userId: 'user-1',
        type: NotificationType.BOOKING_DRIVER_ASSIGNED,
        title: 'Chauffeur Assigned!',
        body: 'A professional driver has accepted your booking.',
        data: { bookingId: 'bk-1' },
      },
      mockDb as never,
    );

    // createNotification is fire-and-forget on the push branch's own
    // internal awaits, but jest.fn() mocks resolve synchronously enough
    // here that no extra flush is needed before this assertion runs.
    await Promise.resolve();

    expect(mockSendPushToUser).toHaveBeenCalledWith(
      'user-1',
      expect.objectContaining({
        data: expect.objectContaining({ bookingId: 'bk-1', actionUrl: '/customer/bookings' }),
      }),
      mockDb,
    );
  });

  it('tags the push notification by category + entity id, so repeated status updates for the same booking replace rather than stack', async () => {
    await createNotification(
      {
        userId: 'user-1',
        type: NotificationType.BOOKING_DRIVER_EN_ROUTE,
        title: 'Chauffeur En Route',
        body: 'Your chauffeur is on the way.',
        data: { bookingId: 'bk-1' },
      },
      mockDb as never,
    );

    expect(mockSendPushToUser).toHaveBeenCalledWith(
      'user-1',
      expect.objectContaining({ tag: 'BOOKING-bk-1' }),
      mockDb,
    );
  });

  it('leaves notifications with no associated entity untagged, so each stays independently visible', async () => {
    await createNotification(
      {
        userId: 'user-1',
        type: NotificationType.SYSTEM_ANNOUNCEMENT,
        title: 'Platform Update',
        body: 'New features are live.',
      },
      mockDb as never,
    );

    expect(mockSendPushToUser).toHaveBeenCalledWith(
      'user-1',
      expect.objectContaining({ tag: undefined }),
      mockDb,
    );
  });
});
