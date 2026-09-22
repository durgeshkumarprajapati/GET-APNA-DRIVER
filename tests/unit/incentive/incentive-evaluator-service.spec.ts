jest.mock('@/shared/database/prisma', () => ({
  prisma: {
    $transaction: jest.fn((callback: (tx: unknown) => unknown) => callback(mockTx)),
    driverIncentiveCampaign: { findMany: jest.fn() },
    driverIncentiveProgress: { findUnique: jest.fn(), create: jest.fn() },
  },
}));

jest.mock('@/modules/finance/application/services/ledger-service', () => ({
  postFinancialTransaction: jest.fn().mockResolvedValue({ id: 'financial-txn-incentive-1' }),
}));

jest.mock('@/modules/finance/application/services/wallet-service', () => ({
  applyWalletChange: jest.fn(),
}));

// Deliberately has NO `update` mock — the top-level prisma mock above only
// exposes `findMany`/`findUnique`/`create` for driverIncentiveProgress.
// If the reward-finalization write regresses to using the outer `db`
// client instead of the transaction's `tx`, calling `.update` on this
// object throws "is not a function" and the test fails loudly.
const mockTx = {
  driverIncentiveProgress: { update: jest.fn() },
};

import { Prisma, IncentiveCampaignStatus, IncentiveProgressStatus, IncentiveType } from '@prisma/client';
import { evaluateDriverIncentivesForCompletedTrip } from '@/modules/incentive/application/services/incentive-evaluator-service';
import { prisma } from '@/shared/database/prisma';
import { postFinancialTransaction } from '@/modules/finance/application/services/ledger-service';
import { applyWalletChange } from '@/modules/finance/application/services/wallet-service';

const mockedPrisma = prisma as unknown as {
  driverIncentiveCampaign: { findMany: jest.Mock };
  driverIncentiveProgress: { findUnique: jest.Mock; create: jest.Mock };
};

function campaign(overrides: Record<string, unknown> = {}) {
  return {
    id: 'campaign-1',
    name: 'Weekend Sprint',
    status: IncentiveCampaignStatus.ACTIVE,
    incentiveType: IncentiveType.TRIP_COUNT,
    targetValue: new Prisma.Decimal('1.0000'),
    rewardAmount: new Prisma.Decimal('500.0000'),
    startAt: new Date(Date.now() - 86400000),
    endAt: new Date(Date.now() + 86400000),
    ...overrides,
  };
}

function progress(overrides: Record<string, unknown> = {}) {
  return {
    id: 'progress-1',
    campaignId: 'campaign-1',
    driverProfileId: 'driver-1',
    status: IncentiveProgressStatus.IN_PROGRESS,
    currentValue: new Prisma.Decimal('0.0000'),
    targetValue: new Prisma.Decimal('1.0000'),
    rewardAmount: new Prisma.Decimal('500.0000'),
    ...overrides,
  };
}

describe('evaluateDriverIncentivesForCompletedTrip — reward transaction integrity', () => {
  afterEach(() => jest.clearAllMocks());

  it('finalizes the qualifying reward write on the same transaction (`tx`) that posted the ledger entry and wallet credit, not the outer client', async () => {
    mockedPrisma.driverIncentiveCampaign.findMany.mockResolvedValue([campaign()]);
    mockedPrisma.driverIncentiveProgress.findUnique.mockResolvedValue(progress());
    mockTx.driverIncentiveProgress.update.mockResolvedValue(
      progress({ status: IncentiveProgressStatus.REWARDED }),
    );

    const result = await evaluateDriverIncentivesForCompletedTrip({
      driverProfileId: 'driver-1',
      bookingId: 'booking-1',
      fareAmount: '350.00',
    });

    // The ledger posting and wallet credit both ran, and — critically — the
    // progress row's own status flip ran on the SAME `tx`, proving the three
    // writes are wrapped in one atomic transaction rather than the final one
    // leaking out onto a separate, already-committed connection.
    expect(postFinancialTransaction).toHaveBeenCalledTimes(1);
    expect(applyWalletChange).toHaveBeenCalledTimes(1);
    expect(mockTx.driverIncentiveProgress.update).toHaveBeenCalledWith({
      where: { id: 'progress-1' },
      data: expect.objectContaining({
        status: IncentiveProgressStatus.REWARDED,
        financialTransactionId: 'financial-txn-incentive-1',
      }),
    });
    expect(result[0].status).toBe(IncentiveProgressStatus.REWARDED);
  });
});
