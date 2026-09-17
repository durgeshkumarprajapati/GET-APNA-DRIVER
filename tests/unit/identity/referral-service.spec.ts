import {
  Prisma,
  ReferralStatus,
  ReferralCampaignStatus,
  ReferralAudience,
  ReferralRewardType,
} from '@prisma/client';
import {
  generateReferralCodeForUser,
  applyReferralCode,
  evaluateAndQualifyReferral,
  createReferralCampaign,
  getCustomerReferralDashboard,
  getReferralGrowthFunnelAnalytics,
} from '@/modules/identity/application/services/referral-service';
import { getDecimal } from '@/shared/config/configuration-service';
import { applyWalletChange } from '@/modules/finance/application/services/wallet-service';

let referralUpdateMock = jest.fn().mockResolvedValue({
  id: 'ref-1',
  status: ReferralStatus.REWARDED,
  rewardAmount: 200,
});
const financialTransactionCreateMock = jest.fn().mockResolvedValue({ id: 'ft-1' });
const ledgerEntryCreateMock = jest.fn();

const mockDb = {
  userReferralCode: {
    findUnique: jest.fn(),
    create: jest.fn(),
  },
  referral: {
    findUnique: jest.fn(),
    findFirst: jest.fn(),
    create: jest.fn(),
    count: jest.fn(),
    findMany: jest.fn().mockResolvedValue([]),
    groupBy: jest.fn().mockResolvedValue([]),
    aggregate: jest.fn().mockResolvedValue({ _sum: { rewardAmount: 0 } }),
  },
  referralCampaign: {
    findUnique: jest.fn().mockResolvedValue(null),
    findFirst: jest.fn().mockResolvedValue(null),
    findMany: jest.fn().mockResolvedValue([]),
    create: jest.fn(),
    update: jest.fn(),
    count: jest.fn().mockResolvedValue(0),
  },
  driverProfile: {
    findUnique: jest.fn().mockResolvedValue(null),
  },
  $transaction: jest.fn((cb: (tx: unknown) => unknown) =>
    cb({
      referral: {
        update: referralUpdateMock,
      },
      referralCampaign: {
        update: jest.fn().mockResolvedValue({}),
      },
      financialTransaction: {
        findUnique: jest.fn().mockResolvedValue(null),
        create: financialTransactionCreateMock,
      },
      ledgerAccount: {
        findUnique: jest
          .fn()
          .mockImplementation(({ where }: { where: { code: string } }) =>
            Promise.resolve({ id: `acc-${where.code}`, code: where.code, normalBalance: 'DEBIT' }),
          ),
      },
      ledgerEntry: {
        create: ledgerEntryCreateMock,
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
jest.mock('@/modules/finance/application/services/wallet-service', () => ({
  applyWalletChange: jest.fn().mockResolvedValue({ id: 'wallet-1' }),
}));

const mockedApplyWalletChange = applyWalletChange as jest.Mock;

describe('Referral Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockDb.driverProfile.findUnique.mockResolvedValue(null);
    mockDb.referralCampaign.findFirst.mockResolvedValue(null);
    referralUpdateMock = jest.fn().mockResolvedValue({
      id: 'ref-1',
      status: ReferralStatus.REWARDED,
      rewardAmount: 200,
    });
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

    it('rejects referral loops (A -> B -> A)', async () => {
      mockDb.userReferralCode.findUnique.mockResolvedValue({
        id: 'code-1',
        userId: 'user-A',
        code: 'REF-USERA',
      });
      // User B was previously referred by User A
      mockDb.referral.findUnique.mockResolvedValue({
        id: 'ref-existing',
        referrerUserId: 'user-B',
        referredUserId: 'user-A',
      });

      const res = await applyReferralCode(
        { referredUserId: 'user-B', code: 'REF-USERA' },
        mockDb as never,
      );

      expect(res).toBeNull();
      expect(mockDb.referral.create).not.toHaveBeenCalled();
    });

    it('creates PENDING referral relationship for valid code', async () => {
      mockDb.userReferralCode.findUnique.mockResolvedValue({
        id: 'code-1',
        userId: 'user-1',
        code: 'REF-123',
      });
      mockDb.referral.findUnique.mockResolvedValue(null);
      mockDb.referral.create.mockResolvedValue({
        id: 'ref-100',
        referrerUserId: 'user-1',
        referredUserId: 'user-2',
        codeUsed: 'REF-123',
        status: ReferralStatus.PENDING,
      });

      const res = await applyReferralCode(
        { referredUserId: 'user-2', code: 'REF-123' },
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
        campaign: null,
      });

      const res = await evaluateAndQualifyReferral(
        { userId: 'user-2', trigger: 'CUSTOMER_FIRST_TRIP' },
        mockDb as never,
      );

      expect(res).not.toBeNull();
      expect(getDecimal).toHaveBeenCalledWith('referral.customer_reward_amount', 200, mockDb);
    });

    it('posts a REFERRAL_REWARD transaction for every referrer', async () => {
      mockDb.referral.findUnique.mockResolvedValue({
        id: 'ref-1',
        referrerUserId: 'user-1',
        referredUserId: 'user-2',
        status: ReferralStatus.PENDING,
        campaign: null,
      });

      await evaluateAndQualifyReferral(
        { userId: 'user-2', trigger: 'CUSTOMER_FIRST_TRIP' },
        mockDb as never,
      );

      expect(financialTransactionCreateMock).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ transactionType: 'REFERRAL_REWARD' }),
        }),
      );
    });

    it('credits CUSTOMER_PAYABLE when the referrer has no DriverProfile', async () => {
      mockDb.referral.findUnique.mockResolvedValue({
        id: 'ref-1',
        referrerUserId: 'customer-referrer-1',
        referredUserId: 'user-2',
        status: ReferralStatus.PENDING,
        campaign: null,
      });
      mockDb.driverProfile.findUnique.mockResolvedValue(null);

      await evaluateAndQualifyReferral(
        { userId: 'user-2', trigger: 'CUSTOMER_FIRST_TRIP' },
        mockDb as never,
      );

      expect(ledgerEntryCreateMock).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            ledgerAccountId: 'acc-CUSTOMER_PAYABLE',
            creditAmount: '200.0000',
          }),
        }),
      );
      expect(mockedApplyWalletChange).not.toHaveBeenCalled();
    });

    it('credits DRIVER_PAYABLE and DriverWallet when referrer is an onboarded driver', async () => {
      mockDb.referral.findUnique.mockResolvedValue({
        id: 'ref-1',
        referrerUserId: 'driver-referrer-1',
        referredUserId: 'user-2',
        status: ReferralStatus.PENDING,
        campaign: null,
      });
      mockDb.driverProfile.findUnique.mockResolvedValue({
        id: 'driver-profile-1',
        userId: 'driver-referrer-1',
      });

      await evaluateAndQualifyReferral(
        { userId: 'user-2', trigger: 'CUSTOMER_FIRST_TRIP' },
        mockDb as never,
      );

      expect(ledgerEntryCreateMock).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            ledgerAccountId: 'acc-DRIVER_PAYABLE',
            creditAmount: '200.0000',
          }),
        }),
      );
      expect(mockedApplyWalletChange).toHaveBeenCalledWith(
        expect.objectContaining({
          driverProfileId: 'driver-profile-1',
          availableDelta: '200.0000',
        }),
        expect.anything(),
      );
    });

    it('is a no-op when a concurrent call already rewarded this referral', async () => {
      mockDb.referral.findUnique.mockResolvedValue({
        id: 'ref-1',
        referrerUserId: 'user-1',
        referredUserId: 'user-2',
        status: ReferralStatus.PENDING,
        campaign: null,
      });
      referralUpdateMock = jest.fn().mockRejectedValue(
        new Prisma.PrismaClientKnownRequestError('Record not found', {
          code: 'P2025',
          clientVersion: 'test',
        }),
      );

      const res = await evaluateAndQualifyReferral(
        { userId: 'user-2', trigger: 'CUSTOMER_FIRST_TRIP' },
        mockDb as never,
      );

      expect(res).toBeNull();
      expect(financialTransactionCreateMock).not.toHaveBeenCalled();
      expect(mockedApplyWalletChange).not.toHaveBeenCalled();
    });
  });

  describe('Campaign Management & Growth Analytics', () => {
    it('creates a referral campaign successfully', async () => {
      mockDb.referralCampaign.create.mockResolvedValue({
        id: 'camp-1',
        code: 'SUMMER2026',
        name: 'Summer Growth Campaign',
        status: ReferralCampaignStatus.ACTIVE,
        audience: ReferralAudience.ALL,
        rewardType: ReferralRewardType.MONETARY,
        referrerRewardValue: 300,
      });

      const campaign = await createReferralCampaign(
        {
          code: 'SUMMER2026',
          name: 'Summer Growth Campaign',
          referrerRewardValue: 300,
        },
        'admin-user-1',
        mockDb as never,
      );

      expect(campaign.code).toBe('SUMMER2026');
      expect(mockDb.referralCampaign.create).toHaveBeenCalled();
    });

    it('calculates referral growth funnel analytics correctly', async () => {
      mockDb.referral.count.mockResolvedValue(10);
      mockDb.referral.groupBy.mockResolvedValue([
        { status: 'PENDING', _count: 4 },
        { status: 'QUALIFIED', _count: 1 },
        { status: 'REWARDED', _count: 5 },
      ]);
      mockDb.referral.aggregate.mockResolvedValue({ _sum: { rewardAmount: 1200 } });
      mockDb.referralCampaign.count.mockResolvedValue(2);
      mockDb.referral.findMany.mockResolvedValue([
        {
          createdAt: new Date('2026-09-01T10:00:00Z'),
          qualifiedAt: new Date('2026-09-01T12:00:00Z'),
        },
      ]);

      const analytics = await getReferralGrowthFunnelAnalytics(mockDb as never);

      expect(analytics.totalAttributed).toBe(10);
      expect(analytics.totalQualified).toBe(6);
      expect(analytics.conversionRatePercent).toBe(60);
      expect(analytics.totalRewardedSpend).toBe(1200);
      expect(analytics.avgTimeToConversionHours).toBe(2);
    });

    it('returns privacy-safe customer referral dashboard data', async () => {
      mockDb.userReferralCode.findUnique.mockResolvedValue({
        id: 'code-1',
        userId: 'cust-1',
        code: 'REF-CUST1',
      });
      mockDb.referral.findMany.mockResolvedValue([
        {
          id: 'ref-10',
          referrerUserId: 'cust-1',
          referredUserId: 'ref-user-1',
          status: ReferralStatus.REWARDED,
          rewardAmount: 200,
          createdAt: new Date(),
          qualifiedAt: new Date(),
          channel: 'CODE',
          referredUser: {
            customerProfile: {
              firstName: 'Rahul',
              lastName: 'Sharma',
              displayName: 'Rahul Sharma',
            },
            phone: '+919876543210',
          },
        },
      ]);
      mockDb.referralCampaign.findMany.mockResolvedValue([]);

      const dashboard = await getCustomerReferralDashboard(
        'cust-1',
        'https://getapnadriver.com',
        mockDb as never,
      );

      expect(dashboard.referralCode).toBe('REF-CUST1');
      expect(dashboard.totalEarnedRewards).toBe(200);
      expect(dashboard.recentReferrals[0].displayName).toBe('Rahul S.');
    });
  });
});
