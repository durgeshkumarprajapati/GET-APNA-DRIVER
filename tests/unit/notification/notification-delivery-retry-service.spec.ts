jest.mock('@/modules/notification/application/push-notification-service', () => ({
  sendPushToUser: jest.fn(),
}));
jest.mock('@/modules/notification/infrastructure/sms-provider', () => ({
  sendSmsNotification: jest.fn(),
}));
jest.mock('@/modules/notification/application/notification-preference-service', () => ({
  isChannelEnabledForCategory: jest.fn().mockResolvedValue(true),
}));

import type { Db } from '@/shared/database/prisma';
import { processNotificationDeliveryRetries } from '@/modules/notification/application/notification-delivery-retry-service';
import { sendPushToUser } from '@/modules/notification/application/push-notification-service';
import { sendSmsNotification } from '@/modules/notification/infrastructure/sms-provider';

const mockSendPushToUser = sendPushToUser as jest.Mock;
const mockSendSmsNotification = sendSmsNotification as jest.Mock;

function buildPushDeliveryRow(attemptCount: number) {
  return {
    id: 'delivery-1',
    channel: 'PUSH',
    status: 'FAILED',
    attemptCount,
    lastAttemptAt: new Date(Date.now() - 10 * 60 * 1000), // 10 min ago — well past any backoff
    notification: {
      id: 'notif-1',
      userId: 'user-1',
      category: 'PROMOTION',
      title: 'Test',
      body: 'Test body',
      actionUrl: null,
      priority: 'NORMAL',
      data: {},
      user: {
        identities: [{ providerName: 'phone', email: null, phoneNumber: '+919876543210' }],
      },
    },
  };
}

function buildMockDb(deliveryRow: ReturnType<typeof buildPushDeliveryRow>) {
  const update = jest.fn().mockResolvedValue({});
  const create = jest.fn().mockImplementation(({ data }) => Promise.resolve({ id: 'fallback-delivery-1', ...data }));
  return {
    db: {
      notificationDelivery: {
        findMany: jest.fn().mockResolvedValue([deliveryRow]),
        update,
        create,
      },
    } as unknown as Db,
    update,
    create,
  };
}

describe('notification-delivery-retry-service — fallback-once-not-per-attempt regression', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSendPushToUser.mockResolvedValue({ totalSent: 0, totalFailed: 1 });
    mockSendSmsNotification.mockResolvedValue({ messageId: 'sms-1', status: 'delivered' });
  });

  it('does not trigger the SMS/email fallback while retries remain (attemptCount 0 -> 1, MAX_ATTEMPTS=3)', async () => {
    const { db } = buildMockDb(buildPushDeliveryRow(0));

    const result = await processNotificationDeliveryRetries(db);

    expect(result.fallbackTriggeredCount).toBe(0);
    expect(mockSendSmsNotification).not.toHaveBeenCalled();
  });

  it('triggers the fallback exactly once, only on the attempt that exhausts retries', async () => {
    // attemptCount already 2 -> next attempt (3) reaches MAX_ATTEMPTS (3).
    const { db } = buildMockDb(buildPushDeliveryRow(2));

    const result = await processNotificationDeliveryRetries(db);

    expect(result.fallbackTriggeredCount).toBe(1);
    expect(mockSendSmsNotification).toHaveBeenCalledTimes(1);
  });

  it('always sets lastAttemptAt on a failed attempt, so the backoff check advances instead of reusing the original timestamp forever', async () => {
    const { db, update } = buildMockDb(buildPushDeliveryRow(0));

    await processNotificationDeliveryRetries(db);

    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ lastAttemptAt: expect.any(Date) }),
      }),
    );
  });
});
