import 'server-only';
import { type Db } from '@/shared/database/prisma';
import {
  type CandidateRecommendation,
  type RecommendationContextInput,
  RecommendationType,
  RecommendationPriority,
  RecommendationActionType,
} from '../../domain/recommendation-types';

export async function generateLoyaltyCandidates(
  context: RecommendationContextInput,
  db: Db,
): Promise<CandidateRecommendation[]> {
  const loyaltyAccount = await db.customerLoyaltyAccount.findUnique({
    where: { customerId: context.customerId },
    include: {
      currentTier: true,
    },
  });

  if (!loyaltyAccount) {
    return [];
  }

  const candidates: CandidateRecommendation[] = [];

  // 1. Check redeemable rewards
  const redeemableRewards = await db.loyaltyReward.findMany({
    where: {
      status: 'ACTIVE',
      pointsRequired: { lte: loyaltyAccount.currentPoints },
    },
    orderBy: { pointsRequired: 'desc' },
    take: 1,
  });

  if (redeemableRewards.length > 0) {
    const reward = redeemableRewards[0];
    candidates.push({
      id: `loyalty_reward_${reward.id}`,
      type: RecommendationType.LOYALTY_REWARD,
      priority: RecommendationPriority.P3,
      rawScore: 55,
      titleKey: 'customer.recommendations.titles.loyaltyRewardAvailable',
      descriptionKey: 'customer.recommendations.descriptions.rewardRedeemable',
      explanationKey: 'customer.recommendations.explanations.sufficientPointsForReward',
      explanationArgs: {
        rewardTitle: reward.title,
        points: reward.pointsRequired,
      },
      action: {
        type: RecommendationActionType.VIEW_REWARD,
        href: '/customer/dashboard',
        prefillParams: {
          rewardId: reward.id,
        },
      },
      metadata: {
        rewardId: reward.id,
        pointsRequired: reward.pointsRequired,
        currentPoints: loyaltyAccount.currentPoints,
      },
    });
  }

  // 2. Loyalty tier progress
  if (loyaltyAccount.currentTier) {
    candidates.push({
      id: `loyalty_tier_${loyaltyAccount.currentTier.code}`,
      type: RecommendationType.LOYALTY_PROGRESS,
      priority: RecommendationPriority.P3,
      rawScore: 40,
      titleKey: 'customer.recommendations.titles.loyaltyTierStatus',
      descriptionKey: 'customer.recommendations.descriptions.currentTierInfo',
      explanationKey: 'customer.recommendations.explanations.activeTierMember',
      explanationArgs: {
        tierName: loyaltyAccount.currentTier.name,
        points: loyaltyAccount.currentPoints,
      },
      action: {
        type: RecommendationActionType.VIEW_LOYALTY,
        href: '/customer/dashboard',
        prefillParams: {
          tierCode: loyaltyAccount.currentTier.code,
        },
      },
      metadata: {
        tierCode: loyaltyAccount.currentTier.code,
        tierName: loyaltyAccount.currentTier.name,
        currentPoints: loyaltyAccount.currentPoints,
      },
    });
  }

  return candidates;
}
