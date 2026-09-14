import 'server-only';
import { LoyaltyTransactionType, Prisma } from '@prisma/client';
import { prisma, type Db } from '@/shared/database/prisma';
import { insertOutboxEvent } from '@/shared/outbox/outbox-service';
import { getOrCreateLoyaltyAccount } from './loyalty-account-service';
import { evaluateTierForPoints } from './loyalty-tier-service';

export interface EvaluateTripLoyaltyInput {
  customerId: string;
  bookingId: string;
  fareAmount: Prisma.Decimal | number | string;
  completedAt?: Date;
}

export async function evaluateCustomerLoyaltyForCompletedTrip(
  input: EvaluateTripLoyaltyInput,
  db: Db = prisma,
) {
  const idempotencyKey = `loyalty-ride-earned-${input.bookingId}`;

  // Check if points were already awarded for this booking
  const existingTx = await db.loyaltyPointTransaction.findUnique({
    where: { idempotencyKey },
  });
  if (existingTx) {
    return existingTx;
  }

  const account = await getOrCreateLoyaltyAccount(input.customerId, db);
  const fare = new Prisma.Decimal(input.fareAmount).toNumber();
  const tierMultiplier = Number(account.currentTier?.pointMultiplier ?? 1.0);

  // 1 point per ₹100 fare (minimum 1 point for any completed ride)
  const basePoints = Math.max(1, Math.floor(fare / 100));
  const pointsEarned = Math.max(1, Math.round(basePoints * tierMultiplier));

  const runInTx = async (tx: Db) => {
    const newCurrentPoints = account.currentPoints + pointsEarned;
    const newLifetimeEarned = account.lifetimeEarnedPoints + pointsEarned;

    // Check tier upgrade
    const { currentTier: newTier } = await evaluateTierForPoints(newLifetimeEarned, tx);
    const isTierUpgraded = newTier.id !== account.currentTierId;

    const updatedAccount = await tx.customerLoyaltyAccount.update({
      where: { id: account.id },
      data: {
        currentPoints: newCurrentPoints,
        lifetimeEarnedPoints: newLifetimeEarned,
        currentTierId: newTier.id,
        tierUpgradedAt: isTierUpgraded ? new Date() : account.tierUpgradedAt,
      },
    });

    const transaction = await tx.loyaltyPointTransaction.create({
      data: {
        loyaltyAccountId: account.id,
        customerId: input.customerId,
        type: LoyaltyTransactionType.RIDE_EARNED,
        points: pointsEarned,
        balanceAfter: updatedAccount.currentPoints,
        bookingId: input.bookingId,
        idempotencyKey,
        description: `Earned ${pointsEarned} loyalty points for completed trip #${input.bookingId.slice(0, 8)}`,
      },
    });

    // Emit outbox event for notification & analytics
    await insertOutboxEvent(tx, {
      eventType: 'loyalty.points.earned',
      aggregateType: 'CustomerLoyaltyAccount',
      aggregateId: account.id,
      payload: {
        customerId: input.customerId,
        bookingId: input.bookingId,
        pointsEarned,
        newBalance: updatedAccount.currentPoints,
        tierCode: newTier.code,
      },
    });

    if (isTierUpgraded) {
      await insertOutboxEvent(tx, {
        eventType: 'loyalty.tier.upgraded',
        aggregateType: 'CustomerLoyaltyAccount',
        aggregateId: account.id,
        payload: {
          customerId: input.customerId,
          previousTierCode: account.currentTier?.code ?? 'BRONZE',
          newTierCode: newTier.code,
          newTierName: newTier.name,
        },
      });
    }

    return transaction;
  };

  const dbWithTx = db as unknown as {
    $transaction: <T>(cb: (tx: Db) => Promise<T>) => Promise<T>;
  };

  if ('$transaction' in db && typeof dbWithTx.$transaction === 'function') {
    return dbWithTx.$transaction(runInTx);
  }
  return runInTx(db);
}

export async function reverseLoyaltyPointsForTrip(
  bookingId: string,
  reason: string = 'Trip refunded or cancelled',
  db: Db = prisma,
) {
  const originalTx = await db.loyaltyPointTransaction.findFirst({
    where: {
      bookingId,
      type: LoyaltyTransactionType.RIDE_EARNED,
    },
  });

  if (!originalTx) {
    return null; // No loyalty points were awarded for this booking
  }

  const idempotencyKey = `loyalty-reversal-${bookingId}`;
  const existingReversal = await db.loyaltyPointTransaction.findUnique({
    where: { idempotencyKey },
  });
  if (existingReversal) {
    return existingReversal;
  }

  const account = await getOrCreateLoyaltyAccount(originalTx.customerId, db);
  const reversalPoints = -Math.abs(originalTx.points);

  const runInTx = async (tx: Db) => {
    const newCurrentPoints = Math.max(0, account.currentPoints + reversalPoints);

    const updatedAccount = await tx.customerLoyaltyAccount.update({
      where: { id: account.id },
      data: {
        currentPoints: newCurrentPoints,
      },
    });

    const transaction = await tx.loyaltyPointTransaction.create({
      data: {
        loyaltyAccountId: account.id,
        customerId: originalTx.customerId,
        type: LoyaltyTransactionType.REVERSAL,
        points: reversalPoints,
        balanceAfter: updatedAccount.currentPoints,
        bookingId,
        idempotencyKey,
        description: `Reversal of ${originalTx.points} points: ${reason}`,
      },
    });

    return transaction;
  };

  const dbWithTx = db as unknown as {
    $transaction: <T>(cb: (tx: Db) => Promise<T>) => Promise<T>;
  };

  if ('$transaction' in db && typeof dbWithTx.$transaction === 'function') {
    return dbWithTx.$transaction(runInTx);
  }
  return runInTx(db);
}
