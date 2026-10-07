import 'server-only';
import { prisma, type Db } from '@/shared/database/prisma';
import {
  CouponSavingsPreview,
  MembershipTierComparison,
  UnifiedOffersAndRewardsDTO,
} from '../domain/offers-rewards-types';
import { validateCouponForPreview } from '../../promotion/application/services/promotion-eligibility-service';
import { listLoyaltyTiers, evaluateTierForPoints } from './services/loyalty-tier-service';

function extractTierBenefits(benefits: unknown): string[] {
  if (Array.isArray(benefits)) {
    return benefits.filter((b): b is string => typeof b === 'string');
  }
  if (benefits && typeof benefits === 'object') {
    const obj = benefits as Record<string, unknown>;
    if (typeof obj.description === 'string') return [obj.description];
    if (Array.isArray(obj.benefits)) {
      return obj.benefits.filter((b): b is string => typeof b === 'string');
    }
  }
  return [];
}

/**
 * Calculates a transparent savings preview for a coupon code before booking.
 * Delegates to validateCouponForPreview, the same engine the booking-creation
 * preview flow uses — a prior version here only checked promotion.status,
 * ignoring expiry windows, min-booking-value, first-ride-only eligibility,
 * usage limits, and the maxDiscountAmount cap, so this preview could show a
 * discount the booking flow would then refuse to apply.
 */
export async function previewCouponSavings(
  couponCode: string,
  estimatedFare: number,
  userId: string,
  db: Db = prisma,
): Promise<CouponSavingsPreview> {
  const cleanCode = couponCode.trim().toUpperCase();

  const result = await validateCouponForPreview(
    { code: couponCode, fareAmount: estimatedFare.toString(), userId },
    db,
  );

  if (!result.valid) {
    return {
      code: result.code ?? cleanCode,
      isValid: false,
      discountType: 'FLAT',
      discountAmount: 0,
      originalFare: estimatedFare,
      finalEstimatedFare: estimatedFare,
      savingsMessage: result.errorMessage ?? 'Invalid or expired promo code',
      ineligibilityReason: result.errorMessage ?? 'Promo code does not exist or has expired.',
    };
  }

  const discountAmount = Math.round(Number(result.discountAmount));
  const finalEstimatedFare = Math.round(Number(result.finalFare));
  const code = result.code ?? cleanCode;

  return {
    code,
    isValid: true,
    discountType: result.discountType === 'PERCENTAGE' ? 'PERCENTAGE' : 'FIXED',
    discountAmount,
    originalFare: estimatedFare,
    finalEstimatedFare,
    savingsMessage: `You save ₹${discountAmount} with promo code ${code}!`,
  };
}

/**
 * Aggregates all offers, active promotions, loyalty tier progress, points expiry, and reward redemption history.
 */
export async function getUnifiedOffersAndRewardsCenter(
  userId: string,
  db: Db = prisma,
): Promise<UnifiedOffersAndRewardsDTO> {
  const [loyaltyAccount, promotions, rewards, redemptions, tiers] = await Promise.all([
    db.customerLoyaltyAccount.findUnique({
      where: { customerId: userId },
      include: { currentTier: true },
    }),
    db.promotion.findMany({
      where: { status: 'ACTIVE' },
      take: 10,
    }),
    db.loyaltyReward.findMany({
      where: { status: 'ACTIVE' },
      take: 10,
    }),
    db.loyaltyRewardRedemption.findMany({
      where: { customerId: userId },
      include: { reward: true },
      orderBy: { redeemedAt: 'desc' },
      take: 10,
    }),
    listLoyaltyTiers(db),
  ]);

  const pointsBalance = loyaltyAccount?.currentPoints ?? 0;
  // Tier progression is driven by lifetime earned points (matching
  // evaluateTierForPoints, the same rule loyalty-account-service uses to
  // actually promote a customer), never the spendable currentPoints balance
  // — otherwise redeeming points would demote a customer's tier.
  const lifetimePoints = loyaltyAccount?.lifetimeEarnedPoints ?? 0;
  const { currentTier, nextTier } = await evaluateTierForPoints(lifetimePoints, db);

  // A prior version compared loyaltyAccount.currentTier.name (a real seeded
  // name like "Gold Executive") against a hardcoded catalog of
  // Silver/Gold/Platinum — isCurrentTier could never match, and the
  // minPoints/benefits shown were disconnected from the real LoyaltyTier
  // rows entirely.
  const tierComparisons: MembershipTierComparison[] = tiers.map((t) => ({
    tierName: t.name,
    minPointsRequired: t.minimumLifetimePoints,
    benefits: extractTierBenefits(t.benefits),
    isCurrentTier: t.id === currentTier.id,
    pointsToNextTier: Math.max(0, t.minimumLifetimePoints - lifetimePoints),
  }));

  const pointsToNextTier = nextTier
    ? Math.max(0, nextTier.minimumLifetimePoints - lifetimePoints)
    : 0;

  return {
    currentLoyaltyAccount: {
      pointsBalance,
      currentTier: loyaltyAccount?.currentTier?.name ?? currentTier.name,
      pointsToNextTier,
      nextTierName: nextTier?.name ?? currentTier.name,
      pointsExpiringSoon: Math.floor(pointsBalance * 0.1),
      pointsExpiryDate: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString(),
    },
    tierComparisons,
    activePromotions: promotions.map((p) => ({
      id: p.id,
      code: p.code ?? '',
      name: p.name,
      description: p.description ?? `Get special discount with code ${p.code}`,
      discountType: String(p.discountType),
      discountValue:
        p.discountType === 'PERCENTAGE'
          ? `${Number(p.discountValue)}% OFF`
          : `₹${Number(p.discountValue)} OFF`,
      expiresAt: p.endsAt ? p.endsAt.toISOString() : null,
    })),
    availableRewards: rewards.map((r) => ({
      id: r.id,
      title: r.title,
      description: r.description ?? 'Redeem points for ride discount vouchers',
      pointsRequired: r.pointsRequired,
      discountValue: r.discountValue ? `₹${Number(r.discountValue)} OFF` : 'Discount Voucher',
      isClaimable: pointsBalance >= r.pointsRequired,
    })),
    recentRedemptionHistory: redemptions.map((r) => ({
      id: r.id,
      rewardTitle: r.reward?.title || 'Loyalty Reward',
      pointsSpent: r.pointsDeducted,
      redeemedAt: r.redeemedAt.toISOString(),
      status: r.status,
    })),
  };
}
