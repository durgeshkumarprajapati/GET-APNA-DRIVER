import 'server-only';
import {
  LoyaltyRewardStatus,
  LoyaltyRewardType,
  LoyaltyTransactionType,
  LoyaltyRedemptionStatus,
  Prisma,
} from '@prisma/client';
import { prisma, type Db } from '@/shared/database/prisma';
import { getOrCreateLoyaltyAccount } from './loyalty-account-service';
import { getTierByCode } from './loyalty-tier-service';
import type { CreateLoyaltyRewardInput, LoyaltyRewardDTO } from '../../domain/types';
import {
  RewardNotFoundError,
  RewardNotActiveError,
  RewardTierNotMetError,
  InsufficientLoyaltyPointsError,
  RewardLimitExceededError,
} from '../../domain/errors';

export async function listCustomerLoyaltyRewards(
  customerId: string,
  now: Date = new Date(),
  db: Db = prisma,
): Promise<LoyaltyRewardDTO[]> {
  const account = await getOrCreateLoyaltyAccount(customerId, db);

  const rewards = await db.loyaltyReward.findMany({
    where: {
      status: LoyaltyRewardStatus.ACTIVE,
      startsAt: { lte: now },
      OR: [{ expiresAt: null }, { expiresAt: { gte: now } }],
    },
    include: { minimumTier: true },
    orderBy: { pointsRequired: 'asc' },
  });

  const customerRedemptions = await db.loyaltyRewardRedemption.findMany({
    where: { customerId },
    select: { rewardId: true },
  });

  const redemptionCountsMap = new Map<string, number>();
  for (const r of customerRedemptions) {
    redemptionCountsMap.set(r.rewardId, (redemptionCountsMap.get(r.rewardId) ?? 0) + 1);
  }

  const currentTierPriority = account.currentTier?.priority ?? 1;

  return rewards.map((reward) => {
    let canRedeem = true;
    let lockReason: string | null = null;

    const minTierPriority = reward.minimumTier?.priority ?? 1;
    if (currentTierPriority < minTierPriority) {
      canRedeem = false;
      lockReason = `Requires ${reward.minimumTier?.name ?? 'higher tier'}`;
    } else if (account.currentPoints < reward.pointsRequired) {
      canRedeem = false;
      lockReason = `Need ${reward.pointsRequired - account.currentPoints} more points`;
    } else if (
      reward.totalRedemptionLimit !== null &&
      reward.totalRedeemedCount >= reward.totalRedemptionLimit
    ) {
      canRedeem = false;
      lockReason = 'Reward total limit reached';
    } else {
      const redeemedByCust = redemptionCountsMap.get(reward.id) ?? 0;
      if (redeemedByCust >= reward.perCustomerLimit) {
        canRedeem = false;
        lockReason = 'Per-customer redemption limit reached';
      }
    }

    return {
      id: reward.id,
      title: reward.title,
      description: reward.description,
      rewardType: reward.rewardType,
      pointsRequired: reward.pointsRequired,
      minimumTier: reward.minimumTier
        ? {
            id: reward.minimumTier.id,
            code: reward.minimumTier.code,
            name: reward.minimumTier.name,
          }
        : null,
      promotionId: reward.promotionId,
      discountValue: reward.discountValue ? Number(reward.discountValue) : null,
      status: reward.status,
      canRedeem,
      lockReason,
    };
  });
}

export async function createLoyaltyReward(input: CreateLoyaltyRewardInput, db: Db = prisma) {
  let minimumTierId = null;
  if (input.minimumTierCode) {
    const tier = await getTierByCode(input.minimumTierCode, db);
    minimumTierId = tier.id;
  }

  return db.loyaltyReward.create({
    data: {
      title: input.title,
      description: input.description ?? null,
      rewardType: input.rewardType,
      pointsRequired: input.pointsRequired,
      minimumTierId,
      promotionId: input.promotionId ?? null,
      discountValue: input.discountValue ? new Prisma.Decimal(input.discountValue) : null,
      status: input.status ?? LoyaltyRewardStatus.ACTIVE,
      startsAt: input.startsAt ? new Date(input.startsAt) : new Date(),
      expiresAt: input.expiresAt ? new Date(input.expiresAt) : null,
      totalRedemptionLimit: input.totalRedemptionLimit ?? null,
      perCustomerLimit: input.perCustomerLimit ?? 1,
    },
  });
}

export async function updateRewardStatus(
  rewardId: string,
  newStatus: LoyaltyRewardStatus,
  db: Db = prisma,
) {
  const reward = await db.loyaltyReward.findUnique({ where: { id: rewardId } });
  if (!reward) throw new RewardNotFoundError(rewardId);

  return db.loyaltyReward.update({
    where: { id: rewardId },
    data: { status: newStatus },
  });
}

export async function redeemReward(
  customerId: string,
  rewardId: string,
  idempotencyKey?: string,
  now: Date = new Date(),
  db: Db = prisma,
) {
  if (idempotencyKey) {
    const existingRedemption = await db.loyaltyRewardRedemption.findUnique({
      where: { idempotencyKey },
    });
    if (existingRedemption) {
      return existingRedemption;
    }
  }

  const account = await getOrCreateLoyaltyAccount(customerId, db);
  const reward = await db.loyaltyReward.findUnique({
    where: { id: rewardId },
    include: { minimumTier: true, promotion: true },
  });

  if (!reward) throw new RewardNotFoundError(rewardId);
  if (reward.status !== LoyaltyRewardStatus.ACTIVE) throw new RewardNotActiveError(rewardId);

  if (reward.startsAt > now || (reward.expiresAt && reward.expiresAt < now)) {
    throw new RewardNotActiveError(rewardId);
  }

  // Tier check
  const currentTierPriority = account.currentTier?.priority ?? 1;
  const minTierPriority = reward.minimumTier?.priority ?? 1;
  if (currentTierPriority < minTierPriority) {
    throw new RewardTierNotMetError(
      reward.minimumTier?.name ?? 'Required Tier',
      account.currentTier?.name ?? 'Current Tier',
    );
  }

  // Points check
  if (account.currentPoints < reward.pointsRequired) {
    throw new InsufficientLoyaltyPointsError(reward.pointsRequired, account.currentPoints);
  }

  // Redemption limits check
  if (
    reward.totalRedemptionLimit !== null &&
    reward.totalRedeemedCount >= reward.totalRedemptionLimit
  ) {
    throw new RewardLimitExceededError('Total redemption limit reached');
  }

  const existingCustomerRedemptionsCount = await db.loyaltyRewardRedemption.count({
    where: { customerId, rewardId },
  });
  if (existingCustomerRedemptionsCount >= reward.perCustomerLimit) {
    throw new RewardLimitExceededError('You have reached your redemption limit for this reward');
  }

  const runInTx = async (tx: Db) => {
    const newCurrentPoints = account.currentPoints - reward.pointsRequired;
    const newLifetimeRedeemed = account.lifetimeRedeemedPoints + reward.pointsRequired;

    // Deduct points from account
    const updatedAccount = await tx.customerLoyaltyAccount.update({
      where: { id: account.id },
      data: {
        currentPoints: newCurrentPoints,
        lifetimeRedeemedPoints: newLifetimeRedeemed,
      },
    });

    // Update reward redeemed counter
    await tx.loyaltyReward.update({
      where: { id: reward.id },
      data: { totalRedeemedCount: { increment: 1 } },
    });

    // Create redemption record
    const redemption = await tx.loyaltyRewardRedemption.create({
      data: {
        loyaltyAccountId: account.id,
        customerId,
        rewardId: reward.id,
        pointsDeducted: reward.pointsRequired,
        status: LoyaltyRedemptionStatus.COMPLETED,
        idempotencyKey: idempotencyKey ?? `redemption-${reward.id}-${customerId}-${Date.now()}`,
      },
    });

    // Post transaction row
    await tx.loyaltyPointTransaction.create({
      data: {
        loyaltyAccountId: account.id,
        customerId,
        type: LoyaltyTransactionType.REWARD_REDEMPTION,
        points: -reward.pointsRequired,
        balanceAfter: updatedAccount.currentPoints,
        rewardId: reward.id,
        referenceId: redemption.id,
        idempotencyKey: idempotencyKey ? `tx-${idempotencyKey}` : `tx-redemption-${redemption.id}`,
        description: `Redeemed reward: ${reward.title}`,
      },
    });

    return redemption;
  };

  const dbWithTx = db as unknown as {
    $transaction: <T>(cb: (tx: Db) => Promise<T>) => Promise<T>;
  };

  if ('$transaction' in db && typeof dbWithTx.$transaction === 'function') {
    return dbWithTx.$transaction(runInTx);
  }
  return runInTx(db);
}

export async function listAllLoyaltyRewardsForAdmin(db: Db = prisma) {
  const rewards = await db.loyaltyReward.findMany({
    include: { minimumTier: true },
    orderBy: { createdAt: 'desc' },
  });

  return rewards.map((reward) => ({
    id: reward.id,
    rewardCode: reward.title.toUpperCase().replace(/\s+/g, '_'),
    title: reward.title,
    description: reward.description,
    rewardType: reward.rewardType,
    pointsCost: reward.pointsRequired,
    minTierCode: reward.minimumTier?.code ?? 'BRONZE',
    discountType: reward.rewardType === LoyaltyRewardType.DISCOUNT ? 'FLAT_AMOUNT' : 'FLAT_AMOUNT',

    discountValue: reward.discountValue ? Number(reward.discountValue) : 0,
    active: reward.status === LoyaltyRewardStatus.ACTIVE,
    singleUse: reward.perCustomerLimit === 1,
    maxRedemptionsPerUser: reward.perCustomerLimit,
    maxTotalRedemptions: reward.totalRedemptionLimit,
    currentRedemptionsCount: reward.totalRedeemedCount,
    createdAt: reward.createdAt.toISOString(),
  }));
}

