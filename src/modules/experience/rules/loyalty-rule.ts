import type { CustomerExperienceContext } from '../domain/experience-context';
import type { ExperienceRecommendation } from '../domain/experience-types';
import {
  buildRecommendation,
  createExperienceFingerprint,
} from '../domain/experience-recommendation';
import { EXPERIENCE_PRIORITY_WEIGHTS } from '../domain/experience-policy';

export function evaluateLoyaltyRule(
  context: CustomerExperienceContext,
): ExperienceRecommendation | null {
  if (!context.loyaltyAccount) {
    return null;
  }

  const { pointsBalance, tier, pointsToNextTier, availableRewardsCount } = context.loyaltyAccount;

  if (availableRewardsCount > 0) {
    const fingerprint = createExperienceFingerprint(
      context.userId,
      'LOYALTY_REWARD',
      `reward_${availableRewardsCount}`,
    );

    return buildRecommendation({
      type: 'LOYALTY_REWARD',
      category: 'CUSTOMER',
      title: `${availableRewardsCount} Unclaimed Loyalty Rewards`,
      description: `You have ${pointsBalance} points in ${tier} tier. Redeem your ride discounts now!`,
      reason: 'Unclaimed loyalty rewards in account',
      priority: EXPERIENCE_PRIORITY_WEIGHTS.LOYALTY_REWARD,
      isDismissable: true,
      isMandatory: false,
      fingerprint,
      action: {
        type: 'REDEEM_REWARD',
        targetUrl: '/customer/rewards',
        payload: {
          pointsBalance,
          tier,
          availableRewardsCount,
        },
      },
      metadata: {
        pointsBalance,
        tier,
      },
    });
  }

  if (pointsToNextTier > 0 && pointsToNextTier <= 500) {
    const fingerprint = createExperienceFingerprint(
      context.userId,
      'LOYALTY_PROGRESS',
      `tier_${tier}`,
    );

    return buildRecommendation({
      type: 'LOYALTY_PROGRESS',
      category: 'CUSTOMER',
      title: `${pointsToNextTier} Points to Next Tier Upgrade`,
      description: `You are close to reaching the next VIP tier status with higher ride cashbacks.`,
      reason: 'Loyalty tier progression threshold reached',
      priority: EXPERIENCE_PRIORITY_WEIGHTS.LOYALTY_PROGRESS,
      isDismissable: true,
      isMandatory: false,
      fingerprint,
      action: {
        type: 'NAVIGATE_PAGE',
        targetUrl: '/customer/rewards',
        payload: {
          pointsToNextTier,
        },
      },
      metadata: {
        pointsBalance,
        tier,
      },
    });
  }

  return null;
}
