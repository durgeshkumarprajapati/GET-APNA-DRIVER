import 'server-only';
import { LoyaltyTransactionType } from '@prisma/client';
import { prisma, type Db } from '@/shared/database/prisma';
import { evaluateTierForPoints, getTierByCode } from './loyalty-tier-service';
import type {
  CustomerLoyaltySummary,
  LoyaltyPointTransactionDTO,
  AdjustCustomerPointsInput,
} from '../../domain/types';
import { InsufficientLoyaltyPointsError } from '../../domain/errors';

export async function getOrCreateLoyaltyAccount(customerId: string, db: Db = prisma) {
  let account = await db.customerLoyaltyAccount.findUnique({
    where: { customerId },
    include: { currentTier: true },
  });

  if (!account) {
    const bronzeTier = await getTierByCode('BRONZE', db);
    account = await db.customerLoyaltyAccount.create({
      data: {
        customerId,
        currentTierId: bronzeTier.id,
        currentPoints: 0,
        lifetimeEarnedPoints: 0,
        lifetimeRedeemedPoints: 0,
      },
      include: { currentTier: true },
    });
  }

  return account;
}

export async function getCustomerLoyaltySummary(
  customerId: string,
  db: Db = prisma,
): Promise<CustomerLoyaltySummary> {
  const account = await getOrCreateLoyaltyAccount(customerId, db);

  const tiers = await db.loyaltyTier.findMany({
    orderBy: { minimumLifetimePoints: 'asc' },
  });

  const currentTier = account.currentTier || tiers[0];
  const currentTierIndex = tiers.findIndex((t) => t.id === currentTier.id);

  let nextTierInfo: CustomerLoyaltySummary['nextTier'] = null;
  if (currentTierIndex !== -1 && currentTierIndex < tiers.length - 1) {
    const nextTier = tiers[currentTierIndex + 1];
    const currentMin = currentTier.minimumLifetimePoints;
    const nextMin = nextTier.minimumLifetimePoints;
    const pointsNeeded = Math.max(0, nextMin - account.lifetimeEarnedPoints);
    const totalRange = nextMin - currentMin;
    const earnedInRange = account.lifetimeEarnedPoints - currentMin;
    const progressPercentage =
      totalRange > 0 ? Math.min(100, Math.round((earnedInRange / totalRange) * 100)) : 100;

    nextTierInfo = {
      id: nextTier.id,
      code: nextTier.code,
      name: nextTier.name,
      minimumLifetimePoints: nextTier.minimumLifetimePoints,
      pointsNeeded,
      progressPercentage,
    };
  }

  return {
    customerId,
    currentPoints: account.currentPoints,
    lifetimeEarnedPoints: account.lifetimeEarnedPoints,
    lifetimeRedeemedPoints: account.lifetimeRedeemedPoints,
    currentTier: {
      id: currentTier.id,
      code: currentTier.code,
      name: currentTier.name,
      pointMultiplier: Number(currentTier.pointMultiplier),
    },
    nextTier: nextTierInfo,
    tierUpgradedAt: account.tierUpgradedAt ? account.tierUpgradedAt.toISOString() : null,
  };
}

export async function getCustomerLoyaltyTransactions(
  customerId: string,
  take = 20,
  skip = 0,
  db: Db = prisma,
): Promise<LoyaltyPointTransactionDTO[]> {
  const txs = await db.loyaltyPointTransaction.findMany({
    where: { customerId },
    orderBy: { createdAt: 'desc' },
    take: Math.min(50, Math.max(1, take)),
    skip,
  });

  return txs.map((tx) => ({
    id: tx.id,
    type: tx.type,
    points: tx.points,
    balanceAfter: tx.balanceAfter,
    bookingId: tx.bookingId,
    rewardId: tx.rewardId,
    referenceId: tx.referenceId,
    description: tx.description,
    expiresAt: tx.expiresAt ? tx.expiresAt.toISOString() : null,
    createdAt: tx.createdAt.toISOString(),
  }));
}

export const listCustomerLoyaltyTransactions = getCustomerLoyaltyTransactions;

export async function adjustCustomerPoints(input: AdjustCustomerPointsInput, db: Db = prisma) {
  const account = await getOrCreateLoyaltyAccount(input.customerId, db);
  const delta = input.direction === 'ADD' ? Math.abs(input.points) : -Math.abs(input.points);

  if (delta < 0 && account.currentPoints + delta < 0) {
    throw new InsufficientLoyaltyPointsError(Math.abs(input.points), account.currentPoints);
  }

  const runInTx = async (tx: Db) => {
    const newCurrentPoints = account.currentPoints + delta;
    const newLifetimeEarned =
      delta > 0 ? account.lifetimeEarnedPoints + delta : account.lifetimeEarnedPoints;

    const { currentTier: newTier } = await evaluateTierForPoints(newLifetimeEarned, tx);

    const updatedAccount = await tx.customerLoyaltyAccount.update({
      where: { id: account.id },
      data: {
        currentPoints: newCurrentPoints,
        lifetimeEarnedPoints: newLifetimeEarned,
        currentTierId: newTier.id,
        tierUpgradedAt: newTier.id !== account.currentTierId ? new Date() : account.tierUpgradedAt,
      },
    });

    const transaction = await tx.loyaltyPointTransaction.create({
      data: {
        loyaltyAccountId: account.id,
        customerId: input.customerId,
        type: LoyaltyTransactionType.ADMIN_ADJUSTMENT,
        points: delta,
        balanceAfter: updatedAccount.currentPoints,
        adminUserId: input.adminUserId,
        description: `Admin adjustment: ${input.reason}`,
      },
    });

    return { updatedAccount, transaction };
  };

  const dbWithTx = db as unknown as {
    $transaction: <T>(cb: (tx: Db) => Promise<T>) => Promise<T>;
  };

  if ('$transaction' in db && typeof dbWithTx.$transaction === 'function') {
    return dbWithTx.$transaction(runInTx);
  }
  return runInTx(db);
}
