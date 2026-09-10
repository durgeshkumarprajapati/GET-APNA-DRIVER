import 'server-only';
import {
  Prisma,
  ReferralStatus,
  FinancialTransactionType,
  WalletChangeType,
  type Referral,
  type UserReferralCode,
} from '@prisma/client';
import { prisma, type Db } from '@/shared/database/prisma';
import { recordAuditLog } from '@/shared/audit/audit-service';
import { insertOutboxEvent } from '@/shared/outbox/outbox-service';
import { getDecimal } from '@/shared/config/configuration-service';
import { generateRandomToken } from '../../security/tokens';

import { postFinancialTransaction } from '@/modules/finance/application/services/ledger-service';
import { applyWalletChange } from '@/modules/finance/application/services/wallet-service';
import { LEDGER_ACCOUNT_CODES } from '@/modules/finance/domain/ledger-accounts';

export interface ApplyReferralCodeInput {
  referredUserId: string;
  code: string;
}

export interface UserReferralSummary {
  referralCode: string;
  totalReferrals: number;
  qualifiedReferrals: number;
  totalEarnedRewards: number;
}

/**
 * Generates a unique, server-authoritative uppercase referral code for a user.
 */
export async function generateReferralCodeForUser(
  userId: string,
  db: Db = prisma,
): Promise<UserReferralCode> {
  const existing = await db.userReferralCode.findUnique({ where: { userId } });
  if (existing) {
    return existing;
  }

  // Generate 6-char uppercase alphanumeric suffix
  const randomSuffix = generateRandomToken(3).toUpperCase();
  const code = `REF-${randomSuffix}`;

  try {
    return await db.userReferralCode.create({
      data: {
        userId,
        code,
      },
    });
  } catch {
    // Retry with secondary fallback suffix on unlikely collision
    const fallbackCode = `REF-${generateRandomToken(4).toUpperCase()}`;
    return await db.userReferralCode.create({
      data: {
        userId,
        code: fallbackCode,
      },
    });
  }
}

/**
 * Validates and creates a server-authoritative PENDING referral relationship.
 * Enforces fraud prevention: self-referral prevention and single-referral per account.
 */
export async function applyReferralCode(
  input: ApplyReferralCodeInput,
  db: Db = prisma,
): Promise<Referral | null> {
  const { referredUserId, code } = input;
  const cleanCode = code.trim().toUpperCase();

  if (!cleanCode) {
    return null;
  }

  // 1. Find referrer user code
  const referralCodeRecord = await db.userReferralCode.findUnique({
    where: { code: cleanCode },
  });
  if (!referralCodeRecord) {
    return null; // Invalid referral code
  }

  const referrerUserId = referralCodeRecord.userId;

  // 2. Fraud prevention: Self-referral protection
  if (referrerUserId === referredUserId) {
    return null;
  }

  // 3. Fraud prevention: Ensure user hasn't already been referred
  const existingReferral = await db.referral.findUnique({
    where: { referredUserId },
  });
  if (existingReferral) {
    return existingReferral;
  }

  // 4. Create pending referral relationship
  return await db.referral.create({
    data: {
      referrerUserId,
      referredUserId,
      codeUsed: cleanCode,
      status: ReferralStatus.PENDING,
    },
  });
}

export interface QualifyReferralInput {
  userId: string;
  trigger: 'CUSTOMER_FIRST_TRIP' | 'DRIVER_APPROVED_ONBOARDING';
}

/**
 * Idempotently qualifies and rewards a pending referral upon qualifying milestone via double-entry ledger.
 */
export async function evaluateAndQualifyReferral(
  input: QualifyReferralInput,
  db: Db = prisma,
): Promise<Referral | null> {
  const { userId, trigger } = input;

  const referral = await db.referral.findUnique({
    where: { referredUserId: userId },
  });

  if (!referral || referral.status !== ReferralStatus.PENDING) {
    return null; // No active pending referral for this user
  }

  const configKey =
    trigger === 'DRIVER_APPROVED_ONBOARDING'
      ? 'referral.driver_reward_amount'
      : 'referral.customer_reward_amount';
  const defaultAmount = trigger === 'DRIVER_APPROVED_ONBOARDING' ? 500 : 200;

  const rewardAmount = await getDecimal(configKey, defaultAmount, db);
  const rewardAmountStr = rewardAmount.toFixed(4);
  const now = new Date();

  // Find referrer driver profile if exists for wallet posting
  const referrerDriverProfile = db.driverProfile
    ? await db.driverProfile.findUnique({
        where: { userId: referral.referrerUserId },
      })
    : null;

  const updatedReferral = await db.$transaction(async (tx) => {
    // Guard the PENDING -> REWARDED transition in the `where` clause itself
    // (not just the pre-check read above) so two concurrent calls for the
    // same referral can't both "win": Prisma's update() throws P2025 when
    // 0 rows match, which the catch below treats as "already handled by a
    // concurrent call" rather than an error. This is belt-and-suspenders —
    // postFinancialTransaction's per-referral idempotencyKey already
    // prevents a double financial posting even without this guard — but it
    // also stops the Referral row itself from being redundantly rewritten
    // under a race.
    let updated: Referral;
    try {
      updated = await tx.referral.update({
        where: { id: referral.id, status: ReferralStatus.PENDING },
        data: {
          status: ReferralStatus.REWARDED,
          rewardAmount,
          qualifiedAt: now,
          rewardedAt: now,
        },
      });
    } catch (error: unknown) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
        return null;
      }
      throw error;
    }

    // Money owed to a DRIVER referrer is booked to DRIVER_PAYABLE (as
    // before, unchanged); money owed to a plain CUSTOMER referrer — who has
    // no DriverWallet to hold it — is booked to the dedicated
    // CUSTOMER_PAYABLE account instead of being incorrectly parked in
    // DRIVER_PAYABLE with no owner. Either way this is now a real,
    // correctly-labeled REFERRAL_REWARD posting, not a reused
    // PAYMENT_CAPTURED transaction.
    const payableAccountCode = referrerDriverProfile
      ? LEDGER_ACCOUNT_CODES.DRIVER_PAYABLE
      : LEDGER_ACCOUNT_CODES.CUSTOMER_PAYABLE;

    const rewardTransaction = await postFinancialTransaction(
      {
        transactionType: FinancialTransactionType.REFERRAL_REWARD,
        referenceEntityType: 'Referral',
        referenceEntityId: referral.id,
        idempotencyKey: `ref-reward-${referral.id}`,
        description: `Referral bonus for referring user ${referral.referredUserId}`,
        postings: [
          {
            accountCode: LEDGER_ACCOUNT_CODES.MARKETING_REFERRAL_EXPENSE,
            debitAmount: rewardAmountStr,
            creditAmount: '0.0000',
          },
          {
            accountCode: payableAccountCode,
            debitAmount: '0.0000',
            creditAmount: rewardAmountStr,
          },
        ],
      },
      tx,
    );

    // Credit driver wallet if referrer is an onboarded driver
    if (referrerDriverProfile) {
      await applyWalletChange(
        {
          driverProfileId: referrerDriverProfile.id,
          financialTransactionId: rewardTransaction.id,
          changeType: WalletChangeType.EARNING_RECOGNIZED,
          availableDelta: rewardAmountStr,
          totalEarnedDelta: rewardAmountStr,
        },
        tx,
      );
    }

    await recordAuditLog(tx, {
      actorUserId: referral.referrerUserId,
      action: 'identity.referral_rewarded',
      entityType: 'Referral',
      entityId: referral.id,
      beforeState: { status: ReferralStatus.PENDING },
      afterState: {
        status: ReferralStatus.REWARDED,
        rewardAmount: rewardAmountStr,
        trigger,
      },
    });

    await insertOutboxEvent(tx, {
      eventType: 'identity.referral_rewarded',
      aggregateType: 'Referral',
      aggregateId: referral.id,
      payload: {
        referralId: referral.id,
        referrerUserId: referral.referrerUserId,
        referredUserId: referral.referredUserId,
        rewardAmount: rewardAmountStr,
        trigger,
      },
    });

    return updated;
  });

  return updatedReferral;
}

/**
 * Retrieves referral statistics and referral code for a user.
 */
export async function getReferralSummaryForUser(
  userId: string,
  db: Db = prisma,
): Promise<UserReferralSummary> {
  const referralCodeRecord = await generateReferralCodeForUser(userId, db);

  const [totalReferrals, rewardedReferrals] = await Promise.all([
    db.referral.count({ where: { referrerUserId: userId } }),
    db.referral.findMany({
      where: {
        referrerUserId: userId,
        status: ReferralStatus.REWARDED,
      },
      select: { rewardAmount: true },
    }),
  ]);

  const totalEarnedRewards = rewardedReferrals.reduce((sum, ref) => {
    return sum + (ref.rewardAmount ? Number(ref.rewardAmount) : 0);
  }, 0);

  return {
    referralCode: referralCodeRecord.code,
    totalReferrals,
    qualifiedReferrals: rewardedReferrals.length,
    totalEarnedRewards,
  };
}

export interface ReferralProgramMetrics {
  totalReferrals: number;
  byStatus: Record<ReferralStatus, number>;
  /** Sum of rewardAmount across all REWARDED referrals, as a Decimal string. */
  totalRewardedAmount: string;
}

/**
 * Program-wide referral metrics for the admin referral configuration page.
 * No admin-wide aggregate existed before this — getReferralSummaryForUser
 * is scoped to a single referrer.
 */
export async function getReferralProgramMetrics(db: Db = prisma): Promise<ReferralProgramMetrics> {
  const [totalReferrals, statusGroups, rewardedAggregate] = await Promise.all([
    db.referral.count(),
    db.referral.groupBy({ by: ['status'], _count: true }),
    db.referral.aggregate({
      where: { status: ReferralStatus.REWARDED },
      _sum: { rewardAmount: true },
    }),
  ]);

  const byStatus = Object.fromEntries(
    Object.values(ReferralStatus).map((status) => [status, 0]),
  ) as Record<ReferralStatus, number>;
  for (const group of statusGroups) {
    byStatus[group.status] = group._count;
  }

  return {
    totalReferrals,
    byStatus,
    totalRewardedAmount: (rewardedAggregate._sum.rewardAmount ?? 0).toString(),
  };
}
