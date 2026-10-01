import 'server-only';
import { prisma, type Db } from '@/shared/database/prisma';
import {
  CouponSavingsPreview,
  MembershipTierComparison,
  UnifiedOffersAndRewardsDTO,
} from '../domain/offers-rewards-types';

export const MEMBERSHIP_TIERS_CATALOG: Array<{
  name: string;
  minPoints: number;
  benefits: string[];
}> = [
  {
    name: 'Silver',
    minPoints: 0,
    benefits: ['Standard Chauffeur Booking', 'Basic Customer Support', 'Earn 1 Loyalty Point per ₹100 Spent'],
  },
  {
    name: 'Gold',
    minPoints: 1000,
    benefits: ['5% Bonus Loyalty Points', 'Priority Driver Matching', '50% Off Cancellation Fees', 'Dedicated Support Hotline'],
  },
  {
    name: 'Platinum',
    minPoints: 2500,
    benefits: ['10% Bonus Loyalty Points', 'Top-Rated Driver Priority Dispatch', 'Free Ride Scheduling', 'Zero Cancellation Fees', 'VIP Concierge Hotline'],
  },
];

/**
 * Calculates a transparent savings preview for a coupon code before booking.
 */
export async function previewCouponSavings(
  couponCode: string,
  estimatedFare: number,
  db: Db = prisma,
): Promise<CouponSavingsPreview> {
  const cleanCode = couponCode.trim().toUpperCase();

  const promotion = await db.promotion.findFirst({
    where: {
      code: cleanCode,
      status: 'ACTIVE',
    },
  });

  if (!promotion) {
    return {
      code: cleanCode,
      isValid: false,
      discountType: 'FLAT',
      discountAmount: 0,
      originalFare: estimatedFare,
      finalEstimatedFare: estimatedFare,
      savingsMessage: 'Invalid or expired promo code',
      ineligibilityReason: 'Promo code does not exist or has expired.',
    };
  }

  const discountVal = Number(promotion.discountValue);
  let discountAmount = 0;

  if (promotion.discountType === 'PERCENTAGE') {
    discountAmount = Math.round((estimatedFare * discountVal) / 100);
  } else {
    discountAmount = Math.min(estimatedFare, discountVal);
  }

  const finalEstimatedFare = Math.max(0, estimatedFare - discountAmount);

  return {
    code: cleanCode,
    isValid: true,
    discountType: String(promotion.discountType) === 'PERCENTAGE' ? 'PERCENTAGE' : 'FIXED',
    discountAmount,
    originalFare: estimatedFare,
    finalEstimatedFare,
    savingsMessage: `You save ₹${discountAmount} with promo code ${cleanCode}!`,
  };
}

/**
 * Aggregates all offers, active promotions, loyalty tier progress, points expiry, and reward redemption history.
 */
export async function getUnifiedOffersAndRewardsCenter(
  userId: string,
  db: Db = prisma,
): Promise<UnifiedOffersAndRewardsDTO> {
  const [loyaltyAccount, promotions, rewards, redemptions] = await Promise.all([
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
  ]);

  const pointsBalance = loyaltyAccount?.currentPoints ?? 0;
  const currentTierName = loyaltyAccount?.currentTier?.name ?? 'Silver';

  // Calculate tier comparisons
  const tierComparisons: MembershipTierComparison[] = MEMBERSHIP_TIERS_CATALOG.map((t) => {
    const isCurrentTier = t.name.toLowerCase() === currentTierName.toLowerCase();
    const pointsToNextTier = Math.max(0, t.minPoints - pointsBalance);
    return {
      tierName: t.name,
      minPointsRequired: t.minPoints,
      benefits: t.benefits,
      isCurrentTier,
      pointsToNextTier,
    };
  });

  const nextTierObj = MEMBERSHIP_TIERS_CATALOG.find((t) => t.minPoints > pointsBalance) ?? MEMBERSHIP_TIERS_CATALOG[2];
  const pointsToNextTier = Math.max(0, nextTierObj.minPoints - pointsBalance);

  return {
    currentLoyaltyAccount: {
      pointsBalance,
      currentTier: currentTierName,
      pointsToNextTier,
      nextTierName: nextTierObj.name,
      pointsExpiringSoon: Math.floor(pointsBalance * 0.1),
      pointsExpiryDate: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString(),
    },
    tierComparisons,
    activePromotions: promotions.map((p: any) => ({
      id: p.id,
      code: p.code,
      name: p.name,
      description: p.description ?? `Get special discount with code ${p.code}`,
      discountType: String(p.discountType),
      discountValue:
        p.discountType === 'PERCENTAGE' ? `${Number(p.discountValue)}% OFF` : `₹${Number(p.discountValue)} OFF`,
      expiresAt: p.endsAt ? p.endsAt.toISOString() : null,
    })),
    availableRewards: rewards.map((r: any) => ({
      id: r.id,
      title: r.title,
      description: r.description ?? 'Redeem points for ride discount vouchers',
      pointsRequired: r.pointsRequired,
      discountValue: r.discountValue ? `₹${Number(r.discountValue)} OFF` : 'Discount Voucher',
      isClaimable: pointsBalance >= r.pointsRequired,
    })),
    recentRedemptionHistory: redemptions.map((r: any) => ({
      id: r.id,
      rewardTitle: r.reward?.title || 'Loyalty Reward',
      pointsSpent: r.pointsDeducted,
      redeemedAt: r.redeemedAt.toISOString(),
      status: r.status,
    })),
  };
}
