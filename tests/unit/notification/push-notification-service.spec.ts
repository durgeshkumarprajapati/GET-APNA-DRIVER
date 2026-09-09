import {
  registerPushSubscription,
  removePushSubscription,
  sendPushToUser,
} from '@/modules/notification/application/push-notification-service';

interface MockDb {
  pushSubscription: {
    upsert: jest.Mock;
    findUnique: jest.Mock;
    update: jest.Mock;
    findMany: jest.Mock;
  };
}

describe('PushNotificationService', () => {
  let mockDb: MockDb;

  beforeEach(() => {
    mockDb = {
      pushSubscription: {
        upsert: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
        findMany: jest.fn(),
      },
    };
  });

  it('registers web push subscription via upsert', async () => {
    const mockSub = {
      id: 'sub-1',
      userId: 'user-1',
      endpoint: 'https://push.example.com/sub-1',
      p256dhKey: 'key1',
      authKey: 'auth1',
      isActive: true,
    };

    mockDb.pushSubscription.upsert.mockResolvedValue(mockSub);

    const result = await registerPushSubscription(
      'user-1',
      {
        endpoint: 'https://push.example.com/sub-1',
        keys: { p256dh: 'key1', auth: 'auth1' },
      },
      mockDb as unknown as Parameters<typeof registerPushSubscription>[2],
    );

    expect(result).toEqual(mockSub);
    expect(mockDb.pushSubscription.upsert).toHaveBeenCalledTimes(1);
  });

  it('deactivates subscription on removePushSubscription', async () => {
    mockDb.pushSubscription.findUnique.mockResolvedValue({
      id: 'sub-1',
      userId: 'user-1',
      endpoint: 'https://push.example.com/sub-1',
    });
    mockDb.pushSubscription.update.mockResolvedValue({ id: 'sub-1', isActive: false });

    const success = await removePushSubscription(
      'user-1',
      'https://push.example.com/sub-1',
      mockDb as unknown as Parameters<typeof removePushSubscription>[2],
    );

    expect(success).toBe(true);
    expect(mockDb.pushSubscription.update).toHaveBeenCalledWith({
      where: { endpoint: 'https://push.example.com/sub-1' },
      data: { isActive: false },
    });
  });

  it('dispatches push notifications to active user subscriptions', async () => {
    mockDb.pushSubscription.findMany.mockResolvedValue([
      {
        id: 'sub-1',
        userId: 'user-1',
        endpoint: 'https://push.example.com/sub-1',
        p256dhKey: 'p256',
        authKey: 'auth',
        isActive: true,
      },
    ]);

    const res = await sendPushToUser(
      'user-1',
      { title: 'Hello', body: 'World' },
      mockDb as unknown as Parameters<typeof sendPushToUser>[2],
    );

    expect(res.totalSent).toBe(1);
    expect(res.totalFailed).toBe(0);
  });
});
