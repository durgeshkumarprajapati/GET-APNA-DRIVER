import { applyReferralCode } from '@/modules/identity/application/services/referral-service';
import { registerNotificationEventHandlers } from '@/worker/jobs/notification-event-handlers';
import { eventHandlerRegistry } from '@/worker/outbox/event-handler-registry';
import { createNotification } from '@/modules/notification/application/notification-service';
import type { Db } from '@/shared/database/prisma';

jest.mock('@/modules/notification/application/notification-service', () => ({
  createNotification: jest.fn().mockResolvedValue({ id: 'notif-1' }),
}));

describe('Phase 57 Referral System & Notifications — Regression Test Suite', () => {
  const mockDb = {
    userReferralCode: {
      findUnique: jest.fn(),
    },
    referral: {
      findUnique: jest.fn(),
      create: jest.fn(),
    },
    referralCampaign: {
      findFirst: jest.fn(),
    },
    outboxEvent: {
      create: jest.fn(),
    },
  } as unknown as Db;

  beforeAll(() => {
    registerNotificationEventHandlers();
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('1. Anti-abuse: Self-referral is rejected', async () => {
    (mockDb.userReferralCode.findUnique as jest.Mock).mockResolvedValue({
      userId: 'user-A',
      code: 'REF-USERA',
    });

    const result = await applyReferralCode(
      {
        referredUserId: 'user-A',
        code: 'REF-USERA',
      },
      mockDb,
    );

    expect(result).toBeNull();
    expect(mockDb.referral.create).not.toHaveBeenCalled();
  });

  it('2. Anti-abuse: Referral loop (A -> B -> A) is rejected', async () => {
    (mockDb.userReferralCode.findUnique as jest.Mock).mockResolvedValue({
      userId: 'user-A',
      code: 'REF-USERA',
    });

    // reverseReferral: user-A was referred by user-B
    (mockDb.referral.findUnique as jest.Mock).mockResolvedValue({
      referrerUserId: 'user-B',
      referredUserId: 'user-A',
    });

    const result = await applyReferralCode(
      {
        referredUserId: 'user-B',
        code: 'REF-USERA',
      },
      mockDb,
    );

    expect(result).toBeNull();
  });

  it('3. referral.created event dispatches notifications to both referrer and referee without PII leakage', async () => {
    const handler = eventHandlerRegistry.getHandler('referral.created');
    expect(handler).toBeDefined();

    const fakeEvent = { id: 'evt-created-1' } as never;
    const payload = {
      referralId: 'ref-100',
      referrerUserId: 'user-referrer',
      referredUserId: 'user-referee',
    };

    await handler!(fakeEvent, payload, mockDb);

    expect(createNotification).toHaveBeenCalledTimes(2);

    // Referrer notification
    expect(createNotification).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'user-referrer',
        idempotencyKey: 'evt-created-1-referral-invited',
        title: 'New Referral Registration',
        body: expect.stringContaining('Someone registered using your referral code'),
      }),
      mockDb,
    );

    // Referee notification
    expect(createNotification).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'user-referee',
        idempotencyKey: 'evt-created-1-referral-invited-referee',
        title: 'Referral Code Applied!',
        body: expect.stringContaining('You registered using a referral code'),
      }),
      mockDb,
    );
  });

  it('4. referral.rewarded event dispatches wallet bonus notification with idempotency', async () => {
    const handler = eventHandlerRegistry.getHandler('referral.rewarded');
    expect(handler).toBeDefined();

    const fakeEvent = { id: 'evt-reward-1' } as never;
    const payload = {
      referralId: 'ref-100',
      referrerUserId: 'user-referrer',
      rewardAmount: 500,
    };

    await handler!(fakeEvent, payload, mockDb);

    expect(createNotification).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'user-referrer',
        idempotencyKey: 'evt-reward-1-referral-rewarded-referrer',
        title: 'Referral Bonus Credited!',
        body: expect.stringContaining('₹500'),
      }),
      mockDb,
    );
  });
});
