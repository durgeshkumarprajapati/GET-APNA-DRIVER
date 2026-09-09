import 'server-only';
import { ReferralStatus, type Referral, type UserReferralCode } from '@prisma/client';
import { prisma, type Db } from '@/shared/database/prisma';
import { recordAuditLog } from '@/shared/audit/audit-service';
import { insertOutboxEvent } from '@/shared/outbox/outbox-service';
import { getDecimal } from '@/shared/config/configuration-service';
import { generateRandomToken } from '../../security/tokens';

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
 * Idempotently qualifies and rewards a pending referral upon qualifying milestone.
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
  const now = new Date();

  const updatedReferral = await db.$transaction(async (tx) => {
    const updated = await tx.referral.update({
      where: { id: referral.id },
      data: {
        status: ReferralStatus.REWARDED,
        rewardAmount,
        qualifiedAt: now,
        rewardedAt: now,
      },
    });

    await recordAuditLog(tx, {
      actorUserId: referral.referrerUserId,
      action: 'identity.referral_rewarded',
      entityType: 'Referral',
      entityId: referral.id,
      beforeState: { status: ReferralStatus.PENDING },
      afterState: {
        status: ReferralStatus.REWARDED,
        rewardAmount: rewardAmount.toString(),
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
        rewardAmount: rewardAmount.toString(),
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
