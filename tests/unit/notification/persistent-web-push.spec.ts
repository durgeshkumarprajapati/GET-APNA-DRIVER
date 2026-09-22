import {
  registerPushSubscription,
  removePushSubscription,
  listUserPushSubscriptions,
  sendPushToUser,
} from '@/modules/notification/application/push-notification-service';
import { createNotification } from '@/modules/notification/application/notification-service';
import { pushDeliveryProvider } from '@/modules/notification/infrastructure/push-provider';
import { DeliveryChannel } from '@prisma/client';

const mockTx = {
  pushSubscription: {
    upsert: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
    findMany: jest.fn(),
  },
  notification: {
    create: jest.fn(),
  },
  notificationDelivery: {
    create: jest.fn(),
    update: jest.fn(),
  },
  notificationPreference: {
    findUnique: jest.fn(),
  },
};

jest.mock('@/shared/database/prisma', () => ({
  prisma: {
    $transaction: jest.fn((callback: (tx: unknown) => unknown) => callback(mockTx)),
    pushSubscription: {
      upsert: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      findMany: jest.fn(),
    },
    notification: {
      create: jest.fn(),
    },
    notificationDelivery: {
      create: jest.fn(),
      update: jest.fn(),
    },
    notificationPreference: {
      findUnique: jest.fn(),
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

jest.mock('@/modules/notification/infrastructure/push-provider', () => ({
  pushDeliveryProvider: {
    sendPush: jest.fn(),
  },
}));

describe('Phase 68: Persistent Web Push & Session Re-association', () => {
  const userA = 'user-uuid-1111';
  const userB = 'user-uuid-2222';
  const endpoint1 = 'https://fcm.googleapis.com/fcm/send/device-endpoint-1';
  const endpoint2 = 'https://fcm.googleapis.com/fcm/send/device-endpoint-2';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Server-Side Subscription Persistence & Session Association', () => {
    it('registers a new push subscription for User A', async () => {
      const prismaMock = jest.requireMock('@/shared/database/prisma').prisma;
      prismaMock.pushSubscription.upsert.mockResolvedValue({
        id: 'sub-1',
        userId: userA,
        endpoint: endpoint1,
        p256dhKey: 'p256-key-1',
        authKey: 'auth-key-1',
        isActive: true,
        lastSeenAt: new Date(),
      });

      const result = await registerPushSubscription(userA, {
        endpoint: endpoint1,
        keys: { p256dh: 'p256-key-1', auth: 'auth-key-1' },
        userAgent: 'Mozilla/5.0 Chrome',
      });

      expect(result.userId).toBe(userA);
      expect(prismaMock.pushSubscription.upsert).toHaveBeenCalledWith({
        where: { endpoint: endpoint1 },
        create: expect.objectContaining({
          userId: userA,
          endpoint: endpoint1,
          p256dhKey: 'p256-key-1',
          authKey: 'auth-key-1',
          isActive: true,
        }),
        update: expect.objectContaining({
          userId: userA,
          p256dhKey: 'p256-key-1',
          authKey: 'auth-key-1',
          isActive: true,
        }),
      });
    });

    it('re-associates existing browser subscription endpoint to User B when User B logs in on same device', async () => {
      const prismaMock = jest.requireMock('@/shared/database/prisma').prisma;
      prismaMock.pushSubscription.upsert.mockResolvedValue({
        id: 'sub-1',
        userId: userB,
        endpoint: endpoint1,
        p256dhKey: 'p256-key-1',
        authKey: 'auth-key-1',
        isActive: true,
        lastSeenAt: new Date(),
      });

      const result = await registerPushSubscription(userB, {
        endpoint: endpoint1,
        keys: { p256dh: 'p256-key-1', auth: 'auth-key-1' },
      });

      expect(result.userId).toBe(userB);
      expect(prismaMock.pushSubscription.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { endpoint: endpoint1 },
          update: expect.objectContaining({ userId: userB, isActive: true }),
        }),
      );
    });

    it('supports multiple devices per user without duplicating endpoints', async () => {
      const prismaMock = jest.requireMock('@/shared/database/prisma').prisma;
      prismaMock.pushSubscription.findMany.mockResolvedValue([
        {
          id: 'sub-1',
          userId: userA,
          endpoint: endpoint1,
          p256dhKey: 'k1',
          authKey: 'a1',
          isActive: true,
        },
        {
          id: 'sub-2',
          userId: userA,
          endpoint: endpoint2,
          p256dhKey: 'k2',
          authKey: 'a2',
          isActive: true,
        },
      ]);

      const subs = await listUserPushSubscriptions(userA);
      expect(subs.length).toBe(2);
      expect(subs.map((s: { endpoint: string }) => s.endpoint)).toEqual([endpoint1, endpoint2]);
    });

    it('prevents IDOR / cross-user unauthorized subscription removal', async () => {
      const prismaMock = jest.requireMock('@/shared/database/prisma').prisma;
      prismaMock.pushSubscription.findUnique.mockResolvedValue({
        id: 'sub-1',
        userId: userA,
        endpoint: endpoint1,
        isActive: true,
      });

      const removed = await removePushSubscription(userB, endpoint1);
      expect(removed).toBe(false);
      expect(prismaMock.pushSubscription.update).not.toHaveBeenCalled();
    });
  });

  describe('Web Push Delivery & Expired Subscription Cleanup', () => {
    it('sends web push to all active user devices', async () => {
      const prismaMock = jest.requireMock('@/shared/database/prisma').prisma;
      prismaMock.pushSubscription.findMany.mockResolvedValue([
        {
          id: 'sub-1',
          userId: userA,
          endpoint: endpoint1,
          p256dhKey: 'k1',
          authKey: 'a1',
          isActive: true,
        },
        {
          id: 'sub-2',
          userId: userA,
          endpoint: endpoint2,
          p256dhKey: 'k2',
          authKey: 'a2',
          isActive: true,
        },
      ]);

      (pushDeliveryProvider.sendPush as jest.Mock).mockResolvedValue({
        success: true,
        statusCode: 201,
      });

      const res = await sendPushToUser(userA, {
        title: 'Trip Update',
        body: 'Driver is en route to pickup.',
      });

      expect(res.totalSent).toBe(2);
      expect(res.totalFailed).toBe(0);
    });

    it('deactivates expired/invalid subscription endpoints (410 Gone / 404)', async () => {
      const prismaMock = jest.requireMock('@/shared/database/prisma').prisma;
      prismaMock.pushSubscription.findMany.mockResolvedValue([
        {
          id: 'sub-expired',
          userId: userA,
          endpoint: endpoint1,
          p256dhKey: 'k1',
          authKey: 'a1',
          isActive: true,
        },
      ]);

      (pushDeliveryProvider.sendPush as jest.Mock).mockResolvedValue({
        success: false,
        statusCode: 410,
        isExpired: true,
        error: 'Subscription expired or revoked',
      });

      const res = await sendPushToUser(userA, { title: 'Test', body: 'Body' });

      expect(res.totalSent).toBe(0);
      expect(res.totalFailed).toBe(1);
      expect(prismaMock.pushSubscription.update).toHaveBeenCalledWith({
        where: { id: 'sub-expired' },
        data: { isActive: false },
      });
    });

    it('ensures push delivery failure does NOT prevent in-app notification creation', async () => {
      const prismaMock = jest.requireMock('@/shared/database/prisma').prisma;
      const createdNotification = {
        id: 'notif-100',
        userId: userA,
        category: 'BOOKING',
        title: 'Driver Arrived',
        body: 'Your driver has arrived at pickup.',
        status: 'UNREAD',
        createdAt: new Date(),
      };

      prismaMock.notification.create.mockResolvedValue(createdNotification);
      prismaMock.notificationPreference.findUnique.mockResolvedValue({ push: true });
      prismaMock.notificationDelivery.create.mockImplementation(
        ({ data }: { data: { channel: string } }) =>
          Promise.resolve({ id: `del-${data.channel}`, ...data }),
      );
      prismaMock.pushSubscription.findMany.mockResolvedValue([
        {
          id: 'sub-1',
          userId: userA,
          endpoint: endpoint1,
          p256dhKey: 'k1',
          authKey: 'a1',
          isActive: true,
        },
      ]);

      (pushDeliveryProvider.sendPush as jest.Mock).mockRejectedValue(new Error('Network error'));

      const result = await createNotification({
        userId: userA,
        category: 'BOOKING',
        type: 'BOOKING_DRIVER_ARRIVED',
        title: 'Driver Arrived',
        body: 'Your driver has arrived at pickup.',
      });

      expect(result.id).toBe('notif-100');
      expect(prismaMock.notification.create).toHaveBeenCalled();
      expect(prismaMock.notificationDelivery.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ channel: DeliveryChannel.IN_APP }),
        }),
      );
    });
  });
});
