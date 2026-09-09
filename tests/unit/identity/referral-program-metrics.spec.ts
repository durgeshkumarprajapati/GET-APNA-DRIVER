import { ReferralStatus } from '@prisma/client';
import { getReferralProgramMetrics } from '@/modules/identity/application/services/referral-service';

jest.mock('@/shared/database/prisma', () => ({ prisma: {} }));
jest.mock('@/shared/audit/audit-service', () => ({ recordAuditLog: jest.fn() }));
jest.mock('@/shared/outbox/outbox-service', () => ({ insertOutboxEvent: jest.fn() }));
jest.mock('@/shared/config/configuration-service', () => ({ getDecimal: jest.fn() }));
jest.mock('@/modules/finance/application/services/ledger-service', () => ({
  postFinancialTransaction: jest.fn(),
}));
jest.mock('@/modules/finance/application/services/wallet-service', () => ({
  applyWalletChange: jest.fn(),
}));

function buildMockDb(overrides: {
  totalReferrals?: number;
  statusGroups?: Array<{ status: ReferralStatus; _count: number }>;
  rewardedSum?: number | null;
}) {
  return {
    referral: {
      count: jest.fn().mockResolvedValue(overrides.totalReferrals ?? 0),
      groupBy: jest.fn().mockResolvedValue(overrides.statusGroups ?? []),
      aggregate: jest
        .fn()
        .mockResolvedValue({ _sum: { rewardAmount: overrides.rewardedSum ?? null } }),
    },
  } as never;
}

describe('getReferralProgramMetrics', () => {
  it('returns zeroed metrics for a program with no referrals yet', async () => {
    const db = buildMockDb({});
    const metrics = await getReferralProgramMetrics(db);

    expect(metrics.totalReferrals).toBe(0);
    expect(metrics.totalRewardedAmount).toBe('0');
    for (const status of Object.values(ReferralStatus)) {
      expect(metrics.byStatus[status]).toBe(0);
    }
  });

  it('aggregates per-status counts and the total rewarded amount', async () => {
    const db = buildMockDb({
      totalReferrals: 12,
      statusGroups: [
        { status: ReferralStatus.PENDING, _count: 3 },
        { status: ReferralStatus.QUALIFIED, _count: 2 },
        { status: ReferralStatus.REWARDED, _count: 5 },
        { status: ReferralStatus.REJECTED, _count: 2 },
      ],
      rewardedSum: 2500,
    });

    const metrics = await getReferralProgramMetrics(db);

    expect(metrics.totalReferrals).toBe(12);
    expect(metrics.byStatus.PENDING).toBe(3);
    expect(metrics.byStatus.QUALIFIED).toBe(2);
    expect(metrics.byStatus.REWARDED).toBe(5);
    expect(metrics.byStatus.REJECTED).toBe(2);
    expect(metrics.totalRewardedAmount).toBe('2500');
  });
});
