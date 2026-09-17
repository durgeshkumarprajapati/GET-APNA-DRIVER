import type { ExperienceRecommendation, ExperienceMetrics } from '../domain/experience-types';
import {
  getCustomerExperienceContext,
  getDriverExperienceContext,
} from './experience-context-service';
import { getDismissedFingerprints } from './experience-dismissal-service';
import { rankAndLimitRecommendations } from './experience-ranking-service';
import { evaluateBookAgainRule } from '../rules/book-again-rule';
import { evaluateFavoriteDriverRule } from '../rules/favorite-driver-rule';
import { evaluateScheduledRideRule } from '../rules/scheduled-ride-rule';
import { evaluateLoyaltyRule } from '../rules/loyalty-rule';
import { evaluatePromotionRule } from '../rules/promotion-rule';
import { evaluateReferralRule } from '../rules/referral-rule';
import { evaluateDriverIncentiveRule } from '../rules/driver-incentive-rule';
import { evaluateTripActionRule } from '../rules/trip-action-rule';
import {
  MAX_CUSTOMER_RECOMMENDATIONS,
  MAX_DRIVER_RECOMMENDATIONS,
} from '../domain/experience-policy';

// Metrics counter for diagnostic endpoint
const metricsState: ExperienceMetrics = {
  totalGenerated: 0,
  totalDismissed: 0,
  latencyMs: 0,
  generatedByType: {},
  generatedByCategory: { CUSTOMER: 0, DRIVER: 0 },
  rulesExecutedCount: 0,
  errorCount: 0,
  lastGeneratedAt: new Date().toISOString(),
};

export class ExperienceOrchestrationService {
  /**
   * Generates deterministic, high-relevance experience recommendations for a Customer.
   * Runs in-memory rule evaluations over asynchronously fetched context.
   */
  static async generateCustomerExperiences(userId: string): Promise<ExperienceRecommendation[]> {
    const startTime = Date.now();
    try {
      const [context, dismissedFingerprints] = await Promise.all([
        getCustomerExperienceContext(userId),
        getDismissedFingerprints(userId),
      ]);

      const candidates: ExperienceRecommendation[] = [];

      // 1. Trip Actions, Safety Alerts, Active Booking
      const tripActions = evaluateTripActionRule(context);
      candidates.push(...tripActions);

      // 2. Book Again
      const bookAgain = evaluateBookAgainRule(context);
      if (bookAgain) candidates.push(bookAgain);

      // 3. Favorite Driver
      const favoriteDriver = evaluateFavoriteDriverRule(context);
      if (favoriteDriver) candidates.push(favoriteDriver);

      // 4. Scheduled Ride
      const scheduledRide = evaluateScheduledRideRule(context);
      if (scheduledRide) candidates.push(scheduledRide);

      // 5. Loyalty Progress & Rewards
      const loyalty = evaluateLoyaltyRule(context);
      if (loyalty) candidates.push(loyalty);

      // 6. Promotions
      const promotion = evaluatePromotionRule(context);
      if (promotion) candidates.push(promotion);

      // 7. Referral
      const referral = evaluateReferralRule(context);
      if (referral) candidates.push(referral);

      // Rank, deduplicate, and limit recommendations
      const ranked = rankAndLimitRecommendations(
        candidates,
        dismissedFingerprints,
        MAX_CUSTOMER_RECOMMENDATIONS,
      );

      // Update telemetry metrics
      const elapsed = Date.now() - startTime;
      this.recordMetrics('CUSTOMER', ranked, elapsed, 7);

      return ranked;
    } catch (error) {
      console.error(
        `[ExperienceOrchestrationService] Error generating customer experiences for ${userId}:`,
        error,
      );
      metricsState.errorCount += 1;
      return [];
    }
  }

  /**
   * Generates deterministic experience recommendations for a Driver.
   */
  static async generateDriverExperiences(userId: string): Promise<ExperienceRecommendation[]> {
    const startTime = Date.now();
    try {
      const [context, dismissedFingerprints] = await Promise.all([
        getDriverExperienceContext(userId),
        getDismissedFingerprints(userId),
      ]);

      if (!context) {
        return [];
      }

      const candidates: ExperienceRecommendation[] = [];

      // 1. Trip Actions, Active Mission Navigation
      const tripActions = evaluateTripActionRule(context);
      candidates.push(...tripActions);

      // 2. Driver Incentive & Goals
      const incentive = evaluateDriverIncentiveRule(context);
      if (incentive) candidates.push(incentive);

      // Rank, deduplicate, and limit recommendations
      const ranked = rankAndLimitRecommendations(
        candidates,
        dismissedFingerprints,
        MAX_DRIVER_RECOMMENDATIONS,
      );

      const elapsed = Date.now() - startTime;
      this.recordMetrics('DRIVER', ranked, elapsed, 2);

      return ranked;
    } catch (error) {
      console.error(
        `[ExperienceOrchestrationService] Error generating driver experiences for ${userId}:`,
        error,
      );
      metricsState.errorCount += 1;
      return [];
    }
  }

  /**
   * Returns engine metrics for diagnostic monitoring.
   */
  static getExperienceMetrics(): ExperienceMetrics {
    return { ...metricsState };
  }

  private static recordMetrics(
    category: 'CUSTOMER' | 'DRIVER',
    recommendations: ExperienceRecommendation[],
    latencyMs: number,
    rulesExecuted: number,
  ) {
    metricsState.totalGenerated += recommendations.length;
    metricsState.latencyMs = Math.round((metricsState.latencyMs + latencyMs) / 2);
    metricsState.rulesExecutedCount += rulesExecuted;
    metricsState.generatedByCategory[category] =
      (metricsState.generatedByCategory[category] || 0) + recommendations.length;
    metricsState.lastGeneratedAt = new Date().toISOString();

    for (const rec of recommendations) {
      metricsState.generatedByType[rec.type] = (metricsState.generatedByType[rec.type] || 0) + 1;
    }
  }
}
