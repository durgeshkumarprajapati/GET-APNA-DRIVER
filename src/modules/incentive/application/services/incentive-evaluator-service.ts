import 'server-only';
import {
  IncentiveCampaignStatus,
  IncentiveProgressStatus,
  FinancialTransactionType,
  WalletChangeType,
  Prisma,
} from '@prisma/client';
import { prisma, type Db } from '@/shared/database/prisma';
import { LEDGER_ACCOUNT_CODES } from '@/modules/finance/domain/ledger-accounts';
import { postFinancialTransaction } from '@/modules/finance/application/services/ledger-service';
import { applyWalletChange } from '@/modules/finance/application/services/wallet-service';

export interface EvaluateTripIncentivesInput {
  driverProfileId: string;
  bookingId: string;
  fareAmount: Prisma.Decimal | number | string;
  completedAt?: Date;
}

export async function evaluateDriverIncentivesForCompletedTrip(
  input: EvaluateTripIncentivesInput,
  db: Db = prisma,
) {
  const completedAt = input.completedAt ?? new Date();

  // Find all ACTIVE campaigns whose date range covers completedAt
  const activeCampaigns = await db.driverIncentiveCampaign.findMany({
    where: {
      status: IncentiveCampaignStatus.ACTIVE,
      startAt: { lte: completedAt },
      endAt: { gte: completedAt },
    },
  });

  if (activeCampaigns.length === 0) {
    return [];
  }

  const fareDecimal = new Prisma.Decimal(input.fareAmount);
  const evaluationResults = [];

  for (const campaign of activeCampaigns) {
    let progress = await db.driverIncentiveProgress.findUnique({
      where: {
        campaignId_driverProfileId: {
          campaignId: campaign.id,
          driverProfileId: input.driverProfileId,
        },
      },
    });

    if (!progress) {
      progress = await db.driverIncentiveProgress.create({
        data: {
          campaignId: campaign.id,
          driverProfileId: input.driverProfileId,
          status: IncentiveProgressStatus.IN_PROGRESS,
          currentValue: new Prisma.Decimal(0),
          targetValue: campaign.targetValue,
          rewardAmount: campaign.rewardAmount,
        },
      });
    }

    // Skip if already qualified/rewarded
    if (
      progress.status === IncentiveProgressStatus.QUALIFIED ||
      progress.status === IncentiveProgressStatus.REWARDED
    ) {
      evaluationResults.push(progress);
      continue;
    }

    // Determine progress increment
    let increment = new Prisma.Decimal(1); // Default for TRIP_COUNT & TIME_WINDOW
    if (campaign.incentiveType === 'EARNINGS_THRESHOLD') {
      increment = fareDecimal;
    }

    const newCurrentValue = new Prisma.Decimal(progress.currentValue).add(increment);
    const targetValue = new Prisma.Decimal(campaign.targetValue);
    const isQualified = newCurrentValue.gte(targetValue);

    if (!isQualified) {
      progress = await db.driverIncentiveProgress.update({
        where: { id: progress.id },
        data: { currentValue: newCurrentValue },
      });
      evaluationResults.push(progress);
      continue;
    }

    // Qualified! Award reward atomically
    const rewardAmount = new Prisma.Decimal(campaign.rewardAmount);
    const idempotencyKey = `incentive-reward-${progress.id}`;

    // Post double-entry transaction & apply wallet change inside transaction
    const runInTx = async (tx: Db) => {
      const finTx = await postFinancialTransaction(
        {
          transactionType: FinancialTransactionType.INCENTIVE_REWARD,
          referenceEntityType: 'DriverIncentiveProgress',
          referenceEntityId: progress!.id,
          idempotencyKey,
          description: `Incentive reward for campaign: ${campaign.name}`,
          postings: [
            {
              accountCode: LEDGER_ACCOUNT_CODES.DRIVER_INCENTIVE_EXPENSE,
              debitAmount: rewardAmount.toFixed(4),
              creditAmount: '0.0000',
            },
            {
              accountCode: LEDGER_ACCOUNT_CODES.DRIVER_PAYABLE,
              debitAmount: '0.0000',
              creditAmount: rewardAmount.toFixed(4),
            },
          ],
        },
        tx,
      );

      await applyWalletChange(
        {
          driverProfileId: input.driverProfileId,
          financialTransactionId: finTx.id,
          changeType: WalletChangeType.INCENTIVE_REWARD,
          availableDelta: rewardAmount.toFixed(4),
          totalEarnedDelta: rewardAmount.toFixed(4),
        },
        tx,
      );

      return db.driverIncentiveProgress.update({
        where: { id: progress!.id },
        data: {
          currentValue: newCurrentValue,
          status: IncentiveProgressStatus.REWARDED,
          qualifiedAt: completedAt,
          rewardedAt: completedAt,
          financialTransactionId: finTx.id,
        },
      });
    };

    const dbWithTx = db as unknown as {
      $transaction: (cb: (tx: Db) => Promise<typeof progress>) => Promise<typeof progress>;
    };

    if ('$transaction' in db && typeof dbWithTx.$transaction === 'function') {
      progress = await dbWithTx.$transaction(runInTx);
    } else {
      progress = await runInTx(db);
    }

    evaluationResults.push(progress);
  }

  return evaluationResults;
}
