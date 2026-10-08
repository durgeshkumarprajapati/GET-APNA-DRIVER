import 'server-only';
import { prisma, type Db } from '@/shared/database/prisma';
import {
  UnifiedOffersLoyalty3DTO,
  AvailableOfferCardDTO,
} from '../../domain/offers-loyalty3-types';
import { getUnifiedOffersAndRewardsCenter } from '../offers-rewards-center-service';
import { validateCouponForPreview } from '@/modules/promotion/application/services/promotion-eligibility-service';

/**
 * Phase 106 — Offers & Loyalty 3.0 Service
 * Consolidates promotions, coupons, and membership progress into a single clear card hub.
 *
 * Reuses getUnifiedOffersAndRewardsCenter (the real, already-hardened
 * Phase 93 offers/loyalty engine) instead of reimplementing it — a prior
 * version hardcoded two offer cards, one referencing a promo code
 * ('FIRST200') that doesn't exist anywhere in the system, both marked
 * isEligible: true unconditionally (Phase 106's own stated goal was
 * "Never show an offer that the real booking engine will reject"), and a
 * fake tier name ('Gold Member' fallback) with fabricated points/progress
 * numbers disconnected from the real seeded LoyaltyTier catalog.
 */
export async function getUnifiedOffersLoyalty3(
  userId: string,
  db: Db = prisma,
): Promise<UnifiedOffersLoyalty3DTO> {
  const center = await getUnifiedOffersAndRewardsCenter(userId, db);

  const availableOffers: AvailableOfferCardDTO[] = await Promise.all(
    center.activePromotions.map(async (p) => {
      // Real per-user eligibility via the same engine the booking flow
      // validates coupons against. A fareAmount of '0' only screens out
      // ineligibility reasons independent of fare (expiry, usage limits,
      // first-ride-only); a real minimum-fare rejection at this stage would
      // be a false negative, so that specific reason is treated as "still
      // eligible, subject to minimum fare" rather than ineligible.
      const preview = await validateCouponForPreview({ code: p.code, fareAmount: '0', userId }, db);
      const isEligible = preview.valid || preview.errorCode === 'MINIMUM_AMOUNT_NOT_MET';

      const expiryDaysRemaining = p.expiresAt
        ? Math.max(
            0,
            Math.ceil((new Date(p.expiresAt).getTime() - Date.now()) / (24 * 60 * 60 * 1000)),
          )
        : 365;

      return {
        id: p.id,
        code: p.code,
        badgeText: p.discountValue,
        title: p.name,
        description: p.description,
        expiryDaysRemaining,
        isEligible,
        ineligibilityReason: isEligible ? undefined : (preview.errorMessage ?? undefined),
      };
    }),
  );

  const currentTierEntry = center.tierComparisons.find((t) => t.isCurrentTier);
  const currentTierMinPoints = currentTierEntry?.minPointsRequired ?? 0;
  const nextTierEntry = center.tierComparisons
    .filter((t) => t.minPointsRequired > currentTierMinPoints)
    .sort((a, b) => a.minPointsRequired - b.minPointsRequired)[0];

  const pointsToNextReward = center.currentLoyaltyAccount.pointsToNextTier;
  const nextRewardProgressPercent = nextTierEntry
    ? Math.max(
        0,
        Math.min(
          100,
          Math.round(
            ((nextTierEntry.minPointsRequired - pointsToNextReward - currentTierMinPoints) /
              (nextTierEntry.minPointsRequired - currentTierMinPoints)) *
              100,
          ),
        ),
      )
    : 100;

  const tierName = center.currentLoyaltyAccount.currentTier;

  return {
    availableOffers,
    membershipCard: {
      tierName,
      pointsBalance: center.currentLoyaltyAccount.pointsBalance,
      pointsToNextReward,
      nextRewardProgressPercent,
      actionableText:
        pointsToNextReward > 0
          ? `${tierName}: ${pointsToNextReward} points away from next reward`
          : `${tierName}: You've reached the top tier`,
    },
  };
}
