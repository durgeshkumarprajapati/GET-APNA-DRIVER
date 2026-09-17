import type { DriverExperienceContext } from '../domain/experience-context';
import type { ExperienceRecommendation } from '../domain/experience-types';
import {
  buildRecommendation,
  createExperienceFingerprint,
} from '../domain/experience-recommendation';
import { EXPERIENCE_PRIORITY_WEIGHTS } from '../domain/experience-policy';

export function evaluateDriverIncentiveRule(
  context: DriverExperienceContext,
): ExperienceRecommendation | null {
  if (context.incentiveCampaigns && context.incentiveCampaigns.length > 0) {
    const activeCampaign = context.incentiveCampaigns[0];
    const remainingTrips = Math.max(0, activeCampaign.targetTrips - activeCampaign.completedTrips);

    const fingerprint = createExperienceFingerprint(
      context.userId,
      'DRIVER_INCENTIVE',
      activeCampaign.id,
    );

    return buildRecommendation({
      type: 'DRIVER_INCENTIVE',
      category: 'DRIVER',
      title: `${activeCampaign.title}`,
      description:
        remainingTrips > 0
          ? `Complete ${remainingTrips} more trip(s) to unlock ₹${activeCampaign.bonusAmount} shift bonus!`
          : `Congratulations! You unlocked the ₹${activeCampaign.bonusAmount} shift bonus.`,
      reason: 'Active driver shift bonus campaign',
      priority: EXPERIENCE_PRIORITY_WEIGHTS.DRIVER_INCENTIVE,
      isDismissable: true,
      isMandatory: false,
      fingerprint,
      action: {
        type: 'VIEW_INCENTIVE',
        targetUrl: '/driver/offers',
        payload: {
          campaignId: activeCampaign.id,
          targetTrips: activeCampaign.targetTrips,
          completedTrips: activeCampaign.completedTrips,
          bonusAmount: activeCampaign.bonusAmount,
        },
      },
      metadata: {
        campaignId: activeCampaign.id,
      },
    });
  }

  if (context.goalPreference && context.earningsSummary) {
    const { dailyTargetAmount } = context.goalPreference;
    const { todayEarnings } = context.earningsSummary;
    if (dailyTargetAmount > 0) {
      const percent = Math.min(100, Math.round((todayEarnings / dailyTargetAmount) * 100));
      const fingerprint = createExperienceFingerprint(
        context.userId,
        'DRIVER_GOAL',
        `goal_${dailyTargetAmount}`,
      );

      return buildRecommendation({
        type: 'DRIVER_GOAL',
        category: 'DRIVER',
        title: `Daily Goal: ${percent}% Achieved`,
        description: `Earned ₹${todayEarnings} of your ₹${dailyTargetAmount} daily target.`,
        reason: 'Daily earnings goal progress tracking',
        priority: EXPERIENCE_PRIORITY_WEIGHTS.DRIVER_GOAL,
        isDismissable: true,
        isMandatory: false,
        fingerprint,
        action: {
          type: 'NAVIGATE_PAGE',
          targetUrl: '/driver/earnings',
          payload: {
            todayEarnings,
            dailyTargetAmount,
            percent,
          },
        },
        metadata: {
          percent,
        },
      });
    }
  }

  return null;
}
