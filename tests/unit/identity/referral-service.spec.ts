import { ReferralStatus } from '@prisma/client';
import {
  generateReferralCodeForUser,
  applyReferralCode,
  evaluateAndQualifyReferral,
  getReferralSummaryForUser,
} from '@/modules/identity/application/services/referral-service';
import { getDecimal } from '@/shared/config/configuration-service';

const mockDb = {
  userReferralCode: {
    findUnique: jest.fn(),
    create: jest.fn(),
  },
  referral: {
    findUnique: jest.fn(),
    create: jest.fn(),
    count: jest.fn(),
    findMany: jest.fn(),
  },
  $transaction: jest.fn((cb: (tx: unknown) => unknown) =>
    cb({
      referral: {
        update: jest.fn().mockResolvedValue({
          id: 'ref-1',
          status: ReferralStatus.REWARDED,
          rewardAmount: 200,
        }),
      },
      financialTransaction: {
        findUnique: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockResolvedValue({ id: 'ft-1' }),
      },
      ledgerAccount: {
        findUnique: jest
          .fn()
          .mockImplementation(({ where }: { where: { code: string } }) =>
            Promise.resolve({ id: `acc-${where.code}`, code: where.code, normalBalance: 'DEBIT' }),
          ),
      },
      ledgerEntry: {
        create: jest.fn(),
        createMany: jest.fn(),
      },
    }),
  ),
};

jest.mock('@/shared/database/prisma', () => ({ prisma: {} }));
jest.mock('@/shared/audit/audit-service', () => ({ recordAuditLog: jest.fn() }));
jest.mock('@/shared/outbox/outbox-service', () => ({ insertOutboxEvent: jest.fn() }));
jest.mock('@/shared/config/configuration-service', () => ({
  getDecimal: jest.fn().mockResolvedValue(200),
}));

describe('Referral Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('generateReferralCodeForUser', () => {
    it('returns existing referral code if present', async () => {
      mockDb.userReferralCode.findUnique.mockResolvedValue({
        id: 'code-1',
        userId: 'user-1',
        code: 'REF-ABC123',
      });

      const res = await generateReferralCodeForUser('user-1', mockDb as never);

      expect(res.code).toBe('REF-ABC123');
      expect(mockDb.userReferralCode.create).not.toHaveBeenCalled();
    });

    it('creates new referral code if not present', async () => {
      mockDb.userReferralCode.findUnique.mockResolvedValue(null);
      mockDb.userReferralCode.create.mockResolvedValue({
        id: 'code-2',
        userId: 'user-2',
        code: 'REF-XYZ789',
      });

      const res = await generateReferralCodeForUser('user-2', mockDb as never);

      expect(res.code).toBe('REF-XYZ789');
      expect(mockDb.userReferralCode.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ userId: 'user-2' }),
      });
    });
  });

  describe('applyReferralCode', () => {
    it('returns null for empty referral code', async () => {
      const res = await applyReferralCode(
        { referredUserId: 'user-2', code: '   ' },
        mockDb as never,
      );
      expect(res).toBeNull();
    });

    it('returns null for non-existent referral code', async () => {
      mockDb.userReferralCode.findUnique.mockResolvedValue(null);

      const res = await applyReferralCode(
        { referredUserId: 'user-2', code: 'INVALID-CODE' },
        mockDb as never,
      );

      expect(res).toBeNull();
    });

    it('rejects self-referral (referrer === referred)', async () => {
      mockDb.userReferralCode.findUnique.mockResolvedValue({
        id: 'code-1',
        userId: 'user-1',
        code: 'REF-SELF12',
      });

      const res = await applyReferralCode(
        { referredUserId: 'user-1', code: 'REF-SELF12' },
        mockDb as never,
      );

      expect(res).toBeNull();
      expect(mockDb.referral.create).not.toHaveBeenCalled();
    });

    it('creates PENDING referral relationship for valid code', async () => {
      mockDb.userReferralCode.findUnique.mockResolvedValue({
        id: 'code-1',
        userId: 'user-1',
        code: 'REF-[#123]',
      });
      mockDb.referral.findUnique.mockResolvedValue(null);
      mockDb.referral.create.mockResolvedValue({
        id: 'ref-100',
        referrerUserId: 'user-1',
        referredUserId: 'user-2',
        codeUsed: 'REF-[#123]',
        status: ReferralStatus.PENDING,
      });

      const res = await applyReferralCode(
        { referredUserId: 'user-2', code: 'REF-[#123]' },
        mockDb as never,
      );

      expect(res).not.toBeNull();
      expect(res?.status).toBe(ReferralStatus.PENDING);
    });
  });

  describe('evaluateAndQualifyReferral', () => {
    it('returns null if no pending referral exists for user', async () => {
      mockDb.referral.findUnique.mockResolvedValue(null);

      const res = await evaluateAndQualifyReferral(
        { userId: 'user-99', trigger: 'CUSTOMER_FIRST_TRIP' },
        mockDb as never,
      );

      expect(res).toBeNull();
    });

    it('qualifies and updates referral to REWARDED upon milestone', async () => {
      mockDb.referral.findUnique.mockResolvedValue({
        id: 'ref-1',
        referrerUserId: 'user-1',
        referredUserId: 'user-2',
        status: ReferralStatus.PENDING,
      });

      const res = await evaluateAndQualifyReferral(
        { userId: 'user-2', trigger: 'CUSTOMER_FIRST_TRIP' },
        mockDb as never,
      );

      expect(res).not.toBeNull();
      expect(getDecimal).toHaveBeenCalledWith('referral.customer_reward_amount', 200, mockDb);
    });
  });

  describe('getReferralSummaryForUser', () => {
    it('calculates total referrals and reward sum correctly', async () => {
      mockDb.userReferralCode.findUnique.mockResolvedValue({
        id: 'code-1',
        userId: 'user-1',
        code: 'REF-SUM123',
      });
      mockDb.referral.count.mockResolvedValue(3);
      mockDb.referral.findMany.mockResolvedValue([{ rewardAmount: 200 }, { rewardAmount: 200 }]);

      const summary = await getReferralSummaryForUser('user-1', mockDb as never);

      expect(summary.referralCode).toBe('REF-SUM123');
      expect(summary.totalReferrals).toBe(3);
      expect(summary.qualifiedReferrals).toBe(2);
      expect(summary.totalEarnedRewards).toBe(400);
    });
  });
});
