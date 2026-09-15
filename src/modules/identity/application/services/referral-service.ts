import 'server-only';
import {
  Prisma,
  ReferralStatus,
  ReferralCampaignStatus,
  ReferralAudience,
  ReferralRewardType,
  FinancialTransactionType,
  WalletChangeType,
  type Referral,
  type UserReferralCode,
  type ReferralCampaign,
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
  channel?: string;
}

export interface UserReferralSummary {
  referralCode: string;
  totalReferrals: number;
  qualifiedReferrals: number;
  totalEarnedRewards: number;
}

export interface ReferralHistoryItem {
  id: string;
  displayName: string;
  status: ReferralStatus;
  rewardAmount: number | null;
  createdAt: Date;
  qualifiedAt: Date | null;
  channel: string | null;
}

export interface CustomerReferralDashboard {
  referralCode: string;
  shareUrl: string;
  totalReferrals: number;
  pendingReferrals: number;
  qualifiedReferrals: number;
  rewardedReferrals: number;
  totalEarnedRewards: number;
  activeCampaigns: Array<{
    id: string;
    code: string;
    name: string;
    description: string | null;
    referrerRewardValue: number;
    refereeRewardValue: number | null;
    endsAt: Date | null;
  }>;
  recentReferrals: ReferralHistoryItem[];
}

export interface DriverReferralDashboard {
  referralCode: string;
  shareUrl: string;
  totalReferrals: number;
  pendingReferrals: number;
  qualifiedReferrals: number;
  rewardedReferrals: number;
  totalEarnedRewards: number;
  activeCampaigns: Array<{
    id: string;
    code: string;
    name: string;
    description: string | null;
    referrerRewardValue: number;
    refereeRewardValue: number | null;
    endsAt: Date | null;
  }>;
  recentReferrals: ReferralHistoryItem[];
}

export interface CreateCampaignInput {
  code: string;
  name: string;
  description?: string;
  audience?: ReferralAudience;
  rewardType?: ReferralRewardType;
  referrerRewardValue: number;
  refereeRewardValue?: number;
  maxRewardsTotal?: number;
  maxRewardsPerUser?: number;
  qualificationTrigger?: string;
  qualificationMinTrips?: number;
  qualificationMinAmount?: number;
  startsAt?: Date;
  endsAt?: Date;
}

export interface ReferralGrowthFunnelAnalytics {
  totalAttributed: number;
  totalRegistered: number;
  totalQualified: number;
  totalRewarded: number;
  totalRejected: number;
  conversionRatePercent: number;
  totalRewardedSpend: number;
  avgTimeToConversionHours: number;
  activeCampaignsCount: number;
  customerReferrals: {
    total: number;
    rewarded: number;
    totalEarned: number;
  };
  driverReferrals: {
    total: number;
    rewarded: number;
    totalEarned: number;
  };
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
 * Enforces anti-abuse safeguards: self-referral protection, referral loop detection (A -> B -> A),
 * and single-referral per account constraint.
 */
export async function applyReferralCode(
  input: ApplyReferralCodeInput,
  db: Db = prisma,
): Promise<Referral | null> {
  const { referredUserId, code, channel } = input;
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

  // 2. Anti-abuse: Self-referral protection
  if (referrerUserId === referredUserId) {
    return null;
  }

  // 3. Anti-abuse: Referral Loop Protection (A -> B -> A)
  // Check if referredUserId is already a referrer to referrerUserId
  const reverseReferral = await db.referral.findUnique({
    where: { referredUserId: referrerUserId },
  });
  if (reverseReferral && reverseReferral.referrerUserId === referredUserId) {
    return null; // Referral loop rejected
  }

  // 4. Fraud prevention: Ensure user hasn't already been referred
  const existingReferral = await db.referral.findUnique({
    where: { referredUserId },
  });
  if (existingReferral) {
    return existingReferral;
  }

  // 5. Check if code matches an active ReferralCampaign directly or find default active campaign
  const now = new Date();
  const matchedCampaign = await db.referralCampaign.findFirst({
    where: {
      status: ReferralCampaignStatus.ACTIVE,
      OR: [
        { code: cleanCode },
        {
          startsAt: { lte: now },
          OR: [{ endsAt: null }, { endsAt: { gte: now } }],
        },
      ],
    },
    orderBy: { createdAt: 'desc' },
  });

  // 6. Create pending referral relationship
  return await db.referral.create({
    data: {
      referrerUserId,
      referredUserId,
      codeUsed: cleanCode,
      campaignId: matchedCampaign?.id ?? null,
      channel: channel ?? 'CODE',
      status: ReferralStatus.PENDING,
    },
  });
}

export interface QualifyReferralInput {
  userId: string;
  trigger: 'CUSTOMER_FIRST_TRIP' | 'DRIVER_APPROVED_ONBOARDING';
  minTrips?: number;
  minAmount?: number;
}

/**
 * Idempotently qualifies and rewards a pending referral upon qualifying milestone via double-entry ledger.
 * Enforces campaign limits, budget caps, and reward idempotency.
 */
export async function evaluateAndQualifyReferral(
  input: QualifyReferralInput,
  db: Db = prisma,
): Promise<Referral | null> {
  const { userId, trigger } = input;

  const referral = await db.referral.findUnique({
    where: { referredUserId: userId },
    include: { campaign: true },
  });

  if (!referral || referral.status !== ReferralStatus.PENDING) {
    return null; // No active pending referral for this user
  }

  // Evaluate linked campaign or default config
  const campaign = referral.campaign;
  const now = new Date();

  if (campaign) {
    if (campaign.status !== ReferralCampaignStatus.ACTIVE) {
      // Campaign paused/expired/archived
      return null;
    }
    if (campaign.startsAt && campaign.startsAt > now) {
      return null;
    }
    if (campaign.endsAt && campaign.endsAt < now) {
      return null;
    }
    if (campaign.maxRewardsTotal && campaign.currentRewardCount >= campaign.maxRewardsTotal) {
      // Campaign total max reward cap reached
      return null;
    }

    // Check per-user reward cap for referrer
    if (campaign.maxRewardsPerUser) {
      const userRewardCount = await db.referral.count({
        where: {
          referrerUserId: referral.referrerUserId,
          campaignId: campaign.id,
          status: ReferralStatus.REWARDED,
        },
      });
      if (userRewardCount >= campaign.maxRewardsPerUser) {
        return null;
      }
    }
  }

  const configKey =
    trigger === 'DRIVER_APPROVED_ONBOARDING'
      ? 'referral.driver_reward_amount'
      : 'referral.customer_reward_amount';
  const defaultAmount = trigger === 'DRIVER_APPROVED_ONBOARDING' ? 500 : 200;

  const referrerRewardAmount = campaign
    ? Number(campaign.referrerRewardValue)
    : Number(await getDecimal(configKey, defaultAmount, db));

  const refereeRewardAmount = campaign?.refereeRewardValue
    ? Number(campaign.refereeRewardValue)
    : null;

  const rewardAmountStr = referrerRewardAmount.toFixed(4);

  // Find referrer driver profile if exists for wallet posting
  const referrerDriverProfile = db.driverProfile
    ? await db.driverProfile.findUnique({
        where: { userId: referral.referrerUserId },
      })
    : null;

  const updatedReferral = await db.$transaction(async (tx) => {
    let updated: Referral;
    try {
      updated = await tx.referral.update({
        where: { id: referral.id, status: ReferralStatus.PENDING },
        data: {
          status: ReferralStatus.REWARDED,
          rewardAmount: referrerRewardAmount,
          refereeRewardAmount,
          qualifiedAt: now,
          rewardedAt: now,
          refereeRewardedAt: refereeRewardAmount ? now : null,
        },
      });
    } catch (error: unknown) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
        return null;
      }
      throw error;
    }

    // Money owed to a DRIVER referrer is booked to DRIVER_PAYABLE;
    // money owed to a CUSTOMER referrer is booked to CUSTOMER_PAYABLE.
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

    // Increment campaign counts if campaign is attached
    if (campaign) {
      await tx.referralCampaign.update({
        where: { id: campaign.id },
        data: {
          currentRewardCount: { increment: 1 },
          currentRewardSpent: { increment: referrerRewardAmount },
        },
      });
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
        campaignId: campaign?.id ?? null,
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
        campaignId: campaign?.id ?? null,
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

/**
 * Retrieves full Customer Referral Dashboard data including code, share URL, stats, active campaigns, and history.
 */
export async function getCustomerReferralDashboard(
  userId: string,
  baseUrl = 'https://getapnadriver.com',
  db: Db = prisma,
): Promise<CustomerReferralDashboard> {
  const referralCodeRecord = await generateReferralCodeForUser(userId, db);

  const [referrals, activeCampaigns] = await Promise.all([
    db.referral.findMany({
      where: { referrerUserId: userId },
      include: {
        referredUser: {
          include: {
            customerProfile: { select: { firstName: true, lastName: true, displayName: true } },
            driverProfile: { select: { firstName: true, lastName: true, displayName: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    }),
    db.referralCampaign.findMany({
      where: {
        status: ReferralCampaignStatus.ACTIVE,
        audience: { in: [ReferralAudience.ALL, ReferralAudience.CUSTOMER] },
      },
      orderBy: { createdAt: 'desc' },
      take: 10,
    }),
  ]);

  const pendingReferrals = referrals.filter((r) => r.status === ReferralStatus.PENDING).length;
  const qualifiedReferrals = referrals.filter((r) => r.status === ReferralStatus.QUALIFIED).length;
  const rewardedReferrals = referrals.filter((r) => r.status === ReferralStatus.REWARDED).length;
  const totalEarnedRewards = referrals
    .filter((r) => r.status === ReferralStatus.REWARDED)
    .reduce((sum, r) => sum + (r.rewardAmount ? Number(r.rewardAmount) : 0), 0);

  const recentReferrals: ReferralHistoryItem[] = referrals.map((ref) => {
    const cp = ref.referredUser?.customerProfile;
    const dp = ref.referredUser?.driverProfile;
    const rawName =
      cp?.displayName ||
      (cp?.firstName ? `${cp.firstName} ${cp.lastName ?? ''}` : null) ||
      dp?.displayName ||
      (dp?.firstName ? `${dp.firstName} ${dp.lastName ?? ''}` : null) ||
      'User';

    // Privacy-safe display name formatting (e.g., "Rahul S.")
    const parts = rawName.trim().split(' ');
    const displayName =
      parts.length > 1 ? `${parts[0]} ${parts[parts.length - 1].substring(0, 1)}.` : parts[0];

    return {
      id: ref.id,
      displayName,
      status: ref.status,
      rewardAmount: ref.rewardAmount ? Number(ref.rewardAmount) : null,
      createdAt: ref.createdAt,
      qualifiedAt: ref.qualifiedAt,
      channel: ref.channel,
    };
  });

  return {
    referralCode: referralCodeRecord.code,
    shareUrl: `${baseUrl}/register?ref=${referralCodeRecord.code}`,
    totalReferrals: referrals.length,
    pendingReferrals,
    qualifiedReferrals,
    rewardedReferrals,
    totalEarnedRewards,
    activeCampaigns: activeCampaigns.map((c) => ({
      id: c.id,
      code: c.code,
      name: c.name,
      description: c.description,
      referrerRewardValue: Number(c.referrerRewardValue),
      refereeRewardValue: c.refereeRewardValue ? Number(c.refereeRewardValue) : null,
      endsAt: c.endsAt,
    })),
    recentReferrals,
  };
}

/**
 * Retrieves full Driver Referral Dashboard data.
 */
export async function getDriverReferralDashboard(
  userId: string,
  baseUrl = 'https://getapnadriver.com',
  db: Db = prisma,
): Promise<DriverReferralDashboard> {
  const referralCodeRecord = await generateReferralCodeForUser(userId, db);

  const [referrals, activeCampaigns] = await Promise.all([
    db.referral.findMany({
      where: { referrerUserId: userId },
      include: {
        referredUser: {
          include: {
            customerProfile: { select: { firstName: true, lastName: true, displayName: true } },
            driverProfile: { select: { firstName: true, lastName: true, displayName: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    }),
    db.referralCampaign.findMany({
      where: {
        status: ReferralCampaignStatus.ACTIVE,
        audience: { in: [ReferralAudience.ALL, ReferralAudience.DRIVER] },
      },
      orderBy: { createdAt: 'desc' },
      take: 10,
    }),
  ]);

  const pendingReferrals = referrals.filter((r) => r.status === ReferralStatus.PENDING).length;
  const qualifiedReferrals = referrals.filter((r) => r.status === ReferralStatus.QUALIFIED).length;
  const rewardedReferrals = referrals.filter((r) => r.status === ReferralStatus.REWARDED).length;
  const totalEarnedRewards = referrals
    .filter((r) => r.status === ReferralStatus.REWARDED)
    .reduce((sum, r) => sum + (r.rewardAmount ? Number(r.rewardAmount) : 0), 0);

  const recentReferrals: ReferralHistoryItem[] = referrals.map((ref) => {
    const cp = ref.referredUser?.customerProfile;
    const dp = ref.referredUser?.driverProfile;
    const rawName =
      dp?.displayName ||
      (dp?.firstName ? `${dp.firstName} ${dp.lastName ?? ''}` : null) ||
      cp?.displayName ||
      (cp?.firstName ? `${cp.firstName} ${cp.lastName ?? ''}` : null) ||
      'Driver Partner';

    const parts = rawName.trim().split(' ');
    const displayName =
      parts.length > 1 ? `${parts[0]} ${parts[parts.length - 1].substring(0, 1)}.` : parts[0];

    return {
      id: ref.id,
      displayName,
      status: ref.status,
      rewardAmount: ref.rewardAmount ? Number(ref.rewardAmount) : null,
      createdAt: ref.createdAt,
      qualifiedAt: ref.qualifiedAt,
      channel: ref.channel,
    };
  });

  return {
    referralCode: referralCodeRecord.code,
    shareUrl: `${baseUrl}/register?ref=${referralCodeRecord.code}`,
    totalReferrals: referrals.length,
    pendingReferrals,
    qualifiedReferrals,
    rewardedReferrals,
    totalEarnedRewards,
    activeCampaigns: activeCampaigns.map((c) => ({
      id: c.id,
      code: c.code,
      name: c.name,
      description: c.description,
      referrerRewardValue: Number(c.referrerRewardValue),
      refereeRewardValue: c.refereeRewardValue ? Number(c.refereeRewardValue) : null,
      endsAt: c.endsAt,
    })),
    recentReferrals,
  };
}

/**
 * Creates a new referral campaign.
 */
export async function createReferralCampaign(
  input: CreateCampaignInput,
  actorUserId: string,
  db: Db = prisma,
): Promise<ReferralCampaign> {
  const campaign = await db.referralCampaign.create({
    data: {
      code: input.code.trim().toUpperCase(),
      name: input.name,
      description: input.description,
      audience: input.audience ?? ReferralAudience.ALL,
      rewardType: input.rewardType ?? ReferralRewardType.MONETARY,
      referrerRewardValue: input.referrerRewardValue,
      refereeRewardValue: input.refereeRewardValue ?? null,
      maxRewardsTotal: input.maxRewardsTotal ?? null,
      maxRewardsPerUser: input.maxRewardsPerUser ?? null,
      qualificationTrigger: input.qualificationTrigger ?? 'CUSTOMER_FIRST_TRIP',
      qualificationMinTrips: input.qualificationMinTrips ?? 1,
      qualificationMinAmount: input.qualificationMinAmount ?? null,
      startsAt: input.startsAt ?? new Date(),
      endsAt: input.endsAt ?? null,
      status: ReferralCampaignStatus.ACTIVE,
    },
  });

  await recordAuditLog(db, {
    actorUserId,
    action: 'referral.campaign_created',
    entityType: 'ReferralCampaign',
    entityId: campaign.id,
    afterState: {
      code: campaign.code,
      name: campaign.name,
      referrerRewardValue: campaign.referrerRewardValue.toString(),
      status: campaign.status,
    },
  });

  return campaign;
}

/**
 * Updates an existing campaign's status.
 */
export async function updateReferralCampaignStatus(
  campaignId: string,
  status: ReferralCampaignStatus,
  actorUserId: string,
  db: Db = prisma,
): Promise<ReferralCampaign> {
  const before = await db.referralCampaign.findUnique({ where: { id: campaignId } });
  if (!before) {
    throw new Error('Referral campaign not found.');
  }

  const updated = await db.referralCampaign.update({
    where: { id: campaignId },
    data: { status },
  });

  await recordAuditLog(db, {
    actorUserId,
    action: 'referral.campaign_status_updated',
    entityType: 'ReferralCampaign',
    entityId: campaignId,
    beforeState: { status: before.status },
    afterState: { status: updated.status },
  });

  return updated;
}

/**
 * Retrieves all referral campaigns for Admin Growth Console.
 */
export async function getReferralCampaigns(db: Db = prisma): Promise<ReferralCampaign[]> {
  return await db.referralCampaign.findMany({
    orderBy: { createdAt: 'desc' },
  });
}

/**
 * Program-wide growth funnel & referral metrics for Admin Growth Console.
 */
export async function getReferralGrowthFunnelAnalytics(
  db: Db = prisma,
): Promise<ReferralGrowthFunnelAnalytics> {
  const [
    totalAttributed,
    statusGroups,
    rewardedAggregate,
    activeCampaignsCount,
    qualifiedReferrals,
    driverReferralsCount,
    driverRewardedCount,
    driverSpendAggregate,
  ] = await Promise.all([
    db.referral.count(),
    db.referral.groupBy({ by: ['status'], _count: true }),
    db.referral.aggregate({
      where: { status: ReferralStatus.REWARDED },
      _sum: { rewardAmount: true },
    }),
    db.referralCampaign.count({ where: { status: ReferralCampaignStatus.ACTIVE } }),
    db.referral.findMany({
      where: {
        status: { in: [ReferralStatus.QUALIFIED, ReferralStatus.REWARDED] },
        qualifiedAt: { not: null },
      },
      select: { createdAt: true, qualifiedAt: true },
    }),
    db.referral.count({
      where: { referrerUser: { driverProfile: { isNot: null } } },
    }),
    db.referral.count({
      where: {
        referrerUser: { driverProfile: { isNot: null } },
        status: ReferralStatus.REWARDED,
      },
    }),
    db.referral.aggregate({
      where: {
        referrerUser: { driverProfile: { isNot: null } },
        status: ReferralStatus.REWARDED,
      },
      _sum: { rewardAmount: true },
    }),
  ]);

  const byStatus: Record<string, number> = {
    PENDING: 0,
    QUALIFIED: 0,
    REWARDED: 0,
    REJECTED: 0,
  };
  for (const group of statusGroups) {
    byStatus[group.status] = group._count;
  }

  const totalRegistered = totalAttributed; // Attributed users are registered
  const totalQualified = (byStatus.QUALIFIED ?? 0) + (byStatus.REWARDED ?? 0);
  const totalRewarded = byStatus.REWARDED ?? 0;
  const totalRejected = byStatus.REJECTED ?? 0;

  const conversionRatePercent =
    totalAttributed > 0 ? Number(((totalQualified / totalAttributed) * 100).toFixed(2)) : 0;

  const totalRewardedSpend = Number(rewardedAggregate._sum.rewardAmount ?? 0);

  // Calculate average time to conversion in hours
  let totalConversionHours = 0;
  for (const ref of qualifiedReferrals) {
    if (ref.qualifiedAt) {
      const diffMs = ref.qualifiedAt.getTime() - ref.createdAt.getTime();
      totalConversionHours += diffMs / (1000 * 60 * 60);
    }
  }
  const avgTimeToConversionHours =
    qualifiedReferrals.length > 0
      ? Number((totalConversionHours / qualifiedReferrals.length).toFixed(1))
      : 0;

  const driverEarned = Number(driverSpendAggregate._sum.rewardAmount ?? 0);
  const customerEarned = totalRewardedSpend - driverEarned;
  const customerTotal = totalAttributed - driverReferralsCount;
  const customerRewarded = totalRewarded - driverRewardedCount;

  return {
    totalAttributed,
    totalRegistered,
    totalQualified,
    totalRewarded,
    totalRejected,
    conversionRatePercent,
    totalRewardedSpend,
    avgTimeToConversionHours,
    activeCampaignsCount,
    customerReferrals: {
      total: Math.max(0, customerTotal),
      rewarded: Math.max(0, customerRewarded),
      totalEarned: Math.max(0, customerEarned),
    },
    driverReferrals: {
      total: driverReferralsCount,
      rewarded: driverRewardedCount,
      totalEarned: driverEarned,
    },
  };
}

export interface ReferralProgramMetrics {
  totalReferrals: number;
  byStatus: Record<ReferralStatus, number>;
  totalRewardedAmount: string;
}

/**
 * Legacy metrics for admin referral page compatibility.
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
