import {
  createNotification,
  getUnreadNotificationCount,
  markNotificationAsRead,
  markAllNotificationsAsRead,
} from '@/modules/notification/application/notification-service';
import { NotificationStatus, NotificationType } from '@prisma/client';

interface MockDb {
  notification: {
    findUnique: jest.Mock;
    create: jest.Mock;
    findMany: jest.Mock;
    count: jest.Mock;
    update: jest.Mock;
    updateMany: jest.Mock;
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
}

describe('NotificationService', () => {
  let mockDb: MockDb;

  beforeEach(() => {
    mockDb = {
      notification: {
        findUnique: jest.fn(),
        create: jest.fn(),
        findMany: jest.fn(),
        count: jest.fn(),
        update: jest.fn(),
        updateMany: jest.fn(),
      },
      notificationDelivery: {
        create: jest.fn(),
        update: jest.fn(),
      },
      notificationPreference: {
        findUnique: jest.fn(),
      },
      pushSubscription: {
        findMany: jest.fn().mockResolvedValue([]),
      },
    };
  });

  it('creates notification and creates IN_APP delivery record', async () => {
    const mockNotification = {
      id: 'notif-1',
      userId: 'user-1',
      type: NotificationType.BOOKING_CREATED,
      title: 'Booking Created',
      body: 'Your request is submitted',
      status: NotificationStatus.UNREAD,
      createdAt: new Date(),
    };

    mockDb.notification.create.mockResolvedValue(mockNotification);
    mockDb.notificationDelivery.create.mockResolvedValue({ id: 'del-1' });

    const result = await createNotification(
      {
        userId: 'user-1',
        type: NotificationType.BOOKING_CREATED,
        title: 'Booking Created',
        body: 'Your request is submitted',
      },
      mockDb as unknown as Parameters<typeof createNotification>[1],
    );

    expect(result).toEqual(mockNotification);
    expect(mockDb.notification.create).toHaveBeenCalledTimes(1);
    expect(mockDb.notificationDelivery.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          notificationId: 'notif-1',
          channel: 'IN_APP',
        }),
      }),
    );
  });

  it('returns existing notification on duplicate idempotencyKey', async () => {
    const existing = {
      id: 'notif-existing',
      userId: 'user-1',
      idempotencyKey: 'key-123',
    };

    mockDb.notification.findUnique.mockResolvedValue(existing);

    const result = await createNotification(
      {
        userId: 'user-1',
        type: NotificationType.BOOKING_CREATED,
        title: 'Title',
        body: 'Body',
        idempotencyKey: 'key-123',
      },
      mockDb as unknown as Parameters<typeof createNotification>[1],
    );

    expect(result).toEqual(existing);
    expect(mockDb.notification.create).not.toHaveBeenCalled();
  });

  it('queries unread notification count correctly', async () => {
    mockDb.notification.count.mockResolvedValue(4);

    const count = await getUnreadNotificationCount(
      'user-1',
      mockDb as unknown as Parameters<typeof getUnreadNotificationCount>[1],
    );

    expect(count).toBe(4);
    expect(mockDb.notification.count).toHaveBeenCalledWith({
      where: {
        userId: 'user-1',
        status: NotificationStatus.UNREAD,
      },
    });
  });

  it('marks individual notification as READ', async () => {
    const unread = {
      id: 'notif-5',
      userId: 'user-1',
      status: NotificationStatus.UNREAD,
    };

    mockDb.notification.findUnique.mockResolvedValue(unread);
    mockDb.notification.update.mockResolvedValue({
      ...unread,
      status: NotificationStatus.READ,
    });

    const updated = await markNotificationAsRead(
      'user-1',
      'notif-5',
      mockDb as unknown as Parameters<typeof markNotificationAsRead>[2],
    );

    expect(updated?.status).toBe(NotificationStatus.READ);
    expect(mockDb.notification.update).toHaveBeenCalledWith({
      where: { id: 'notif-5' },
      data: expect.objectContaining({
        status: NotificationStatus.READ,
      }),
    });
  });

  it('marks all notifications as READ for a user', async () => {
    mockDb.notification.updateMany.mockResolvedValue({ count: 7 });

    const count = await markAllNotificationsAsRead(
      'user-1',
      mockDb as unknown as Parameters<typeof markAllNotificationsAsRead>[1],
    );

    expect(count).toBe(7);
    expect(mockDb.notification.updateMany).toHaveBeenCalledWith({
      where: {
        userId: 'user-1',
        status: NotificationStatus.UNREAD,
      },
      data: expect.objectContaining({
        status: NotificationStatus.READ,
      }),
    });
  });
});
