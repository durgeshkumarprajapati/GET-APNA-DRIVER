import {
  TripAchievementEvaluator,
  StreakAchievementEvaluator,
  RatingAchievementEvaluator,
  EarningsAchievementEvaluator,
  ComplianceAchievementEvaluator,
  AchievementEvaluatorRegistry,
} from '@/modules/driver-engagement/application/achievement-evaluator';
import { AchievementCategory } from '@prisma/client';
import { type DriverEngagementContext } from '@/modules/driver-engagement/domain/achievement-types';

describe('AchievementEvaluator Unit Tests', () => {
  const baseContext: DriverEngagementContext = {
    driverProfileId: 'driver-123',
    completedTripsCount: 25,
    ratingAverage: 4.85,
    totalRatingsCount: 30,
    weeklyEarnings: 12500,
    currentStreakDays: 7,
    isDocumentCompliant: true,
    dailyTripsCompletedToday: 5,
    weeklyTripsCompletedThisWeek: 20,
    evaluatedAt: new Date(),
  };

  describe('TripAchievementEvaluator', () => {
    const evaluator = new TripAchievementEvaluator();

    it('evaluates completed trips target correctly', () => {
      const def = { code: 'TRIPS_25', targetValue: 25, criteriaConfig: null };
      const res = evaluator.evaluate(def, baseContext);
      expect(res.currentValue).toBe(25);
      expect(res.isUnlocked).toBe(true);

      const defHigh = { code: 'TRIPS_50', targetValue: 50, criteriaConfig: null };
      const resHigh = evaluator.evaluate(defHigh, baseContext);
      expect(resHigh.currentValue).toBe(25);
      expect(resHigh.isUnlocked).toBe(false);
    });
  });

  describe('StreakAchievementEvaluator', () => {
    const evaluator = new StreakAchievementEvaluator();

    it('evaluates streak targets correctly', () => {
      const def = { code: 'SEVEN_DAY_STREAK', targetValue: 7, criteriaConfig: null };
      const res = evaluator.evaluate(def, baseContext);
      expect(res.currentValue).toBe(7);
      expect(res.isUnlocked).toBe(true);

      const def30 = { code: 'THIRTY_DAY_STREAK', targetValue: 30, criteriaConfig: null };
      const res30 = evaluator.evaluate(def30, baseContext);
      expect(res30.currentValue).toBe(7);
      expect(res30.isUnlocked).toBe(false);
    });
  });

  describe('RatingAchievementEvaluator', () => {
    const evaluator = new RatingAchievementEvaluator();

    it('requires minimum 15 rating samples before unlocking high rating achievements', () => {
      const lowSampleContext: DriverEngagementContext = {
        ...baseContext,
        totalRatingsCount: 5,
        ratingAverage: 5.0,
      };
      const def = { code: 'HIGH_RATING', targetValue: 4.8, criteriaConfig: null };

      const res = evaluator.evaluate(def, lowSampleContext);
      expect(res.isUnlocked).toBe(false);

      const validContext: DriverEngagementContext = {
        ...baseContext,
        totalRatingsCount: 25,
        ratingAverage: 4.85,
      };
      const resValid = evaluator.evaluate(def, validContext);
      expect(resValid.isUnlocked).toBe(true);
      expect(resValid.currentValue).toBe(4.85);
    });
  });

  describe('EarningsAchievementEvaluator', () => {
    const evaluator = new EarningsAchievementEvaluator();

    it('evaluates weekly earnings milestones correctly', () => {
      const def = { code: 'EARNINGS_10K', targetValue: 10000, criteriaConfig: null };
      const res = evaluator.evaluate(def, baseContext);
      expect(res.currentValue).toBe(12500);
      expect(res.isUnlocked).toBe(true);
    });
  });

  describe('ComplianceAchievementEvaluator', () => {
    const evaluator = new ComplianceAchievementEvaluator();

    it('unlocks only when driver documents are verified and dispatch eligible', () => {
      const def = { code: 'COMPLIANCE', targetValue: 1, criteriaConfig: null };
      const resEligible = evaluator.evaluate(def, baseContext);
      expect(resEligible.isUnlocked).toBe(true);

      const nonCompliantContext: DriverEngagementContext = {
        ...baseContext,
        isDocumentCompliant: false,
      };
      const resNonCompliant = evaluator.evaluate(def, nonCompliantContext);
      expect(resNonCompliant.isUnlocked).toBe(false);
    });
  });

  describe('AchievementEvaluatorRegistry', () => {
    const registry = new AchievementEvaluatorRegistry();

    it('routes evaluation to the correct category evaluator', () => {
      const def = {
        code: 'TRIPS_10',
        category: AchievementCategory.TRIPS,
        targetValue: 10,
        criteriaConfig: null,
      };
      const res = registry.evaluate(def, baseContext);
      expect(res.currentValue).toBe(25);
      expect(res.isUnlocked).toBe(true);
    });
  });
});
