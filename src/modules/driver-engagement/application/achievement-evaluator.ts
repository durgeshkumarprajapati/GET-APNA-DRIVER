import 'server-only';
import { AchievementCategory } from '@prisma/client';
import { type DriverEngagementContext } from '../domain/achievement-types';

export interface EvaluatorResult {
  currentValue: number;
  targetValue: number;
  isUnlocked: boolean;
}

export interface AchievementEvaluator {
  category: AchievementCategory;
  evaluate(
    definition: { code: string; targetValue: number; criteriaConfig: unknown },
    context: DriverEngagementContext,
  ): EvaluatorResult;
}

export class TripAchievementEvaluator implements AchievementEvaluator {
  category = AchievementCategory.TRIPS;

  evaluate(
    definition: { code: string; targetValue: number; criteriaConfig: unknown },
    context: DriverEngagementContext,
  ): EvaluatorResult {
    const target = definition.targetValue;
    const current = context.completedTripsCount;
    return {
      currentValue: current,
      targetValue: target,
      isUnlocked: current >= target,
    };
  }
}

export class StreakAchievementEvaluator implements AchievementEvaluator {
  category = AchievementCategory.STREAK;

  evaluate(
    definition: { code: string; targetValue: number; criteriaConfig: unknown },
    context: DriverEngagementContext,
  ): EvaluatorResult {
    const target = definition.targetValue;
    const current = context.currentStreakDays;
    return {
      currentValue: current,
      targetValue: target,
      isUnlocked: current >= target,
    };
  }
}

export class RatingAchievementEvaluator implements AchievementEvaluator {
  category = AchievementCategory.RATING;

  evaluate(
    definition: { code: string; targetValue: number; criteriaConfig: unknown },
    context: DriverEngagementContext,
  ): EvaluatorResult {
    const target = definition.targetValue; // e.g. 4.8
    const current = context.ratingAverage;
    // Requires minimum sample size of 15 ratings to qualify for rating achievements
    const hasEnoughRatings = context.totalRatingsCount >= 15;
    const isUnlocked = hasEnoughRatings && current >= target;

    return {
      currentValue: current,
      targetValue: target,
      isUnlocked,
    };
  }
}

export class EarningsAchievementEvaluator implements AchievementEvaluator {
  category = AchievementCategory.EARNINGS;

  evaluate(
    definition: { code: string; targetValue: number; criteriaConfig: unknown },
    context: DriverEngagementContext,
  ): EvaluatorResult {
    const target = definition.targetValue;
    const current = context.weeklyEarnings;
    return {
      currentValue: current,
      targetValue: target,
      isUnlocked: current >= target,
    };
  }
}

export class ComplianceAchievementEvaluator implements AchievementEvaluator {
  category = AchievementCategory.COMPLIANCE;

  evaluate(
    _definition: { code: string; targetValue: number; criteriaConfig: unknown },
    context: DriverEngagementContext,
  ): EvaluatorResult {
    const current = context.isDocumentCompliant ? 1 : 0;
    return {
      currentValue: current,
      targetValue: 1,
      isUnlocked: context.isDocumentCompliant,
    };
  }
}

export class GoalAchievementEvaluator implements AchievementEvaluator {
  category = AchievementCategory.GOAL;

  evaluate(
    definition: { code: string; targetValue: number; criteriaConfig: unknown },
    context: DriverEngagementContext,
  ): EvaluatorResult {
    const target = definition.targetValue;
    const current = context.dailyTripsCompletedToday;
    return {
      currentValue: current,
      targetValue: target,
      isUnlocked: current >= target,
    };
  }
}

export class AchievementEvaluatorRegistry {
  private evaluators = new Map<AchievementCategory, AchievementEvaluator>();

  constructor() {
    this.register(new TripAchievementEvaluator());
    this.register(new StreakAchievementEvaluator());
    this.register(new RatingAchievementEvaluator());
    this.register(new EarningsAchievementEvaluator());
    this.register(new ComplianceAchievementEvaluator());
    this.register(new GoalAchievementEvaluator());
  }

  register(evaluator: AchievementEvaluator): void {
    this.evaluators.set(evaluator.category, evaluator);
  }

  evaluate(
    definition: {
      code: string;
      category: AchievementCategory;
      targetValue: number;
      criteriaConfig: unknown;
    },
    context: DriverEngagementContext,
  ): EvaluatorResult {
    const evaluator = this.evaluators.get(definition.category);
    if (!evaluator) {
      // Default fallback evaluator
      const current = context.completedTripsCount;
      return {
        currentValue: current,
        targetValue: definition.targetValue,
        isUnlocked: current >= definition.targetValue,
      };
    }
    return evaluator.evaluate(
      {
        code: definition.code,
        targetValue: definition.targetValue,
        criteriaConfig: definition.criteriaConfig,
      },
      context,
    );
  }
}

export const defaultEvaluatorRegistry = new AchievementEvaluatorRegistry();
