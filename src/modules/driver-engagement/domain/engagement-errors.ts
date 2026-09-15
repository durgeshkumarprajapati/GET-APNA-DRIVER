import { AppError } from '@/shared/errors/app-error';

export class AchievementNotFoundError extends AppError {
  constructor(identifier: string) {
    super(`Achievement definition '${identifier}' was not found.`, 404, 'ACHIEVEMENT_NOT_FOUND');
  }
}

export class InvalidAchievementConfigError extends AppError {
  constructor(reason: string) {
    super(`Invalid achievement configuration: ${reason}`, 400, 'INVALID_ACHIEVEMENT_CONFIG');
  }
}

export class DriverStreakEvaluationError extends AppError {
  constructor(driverProfileId: string, reason: string) {
    super(
      `Failed to evaluate streak for driver '${driverProfileId}': ${reason}`,
      500,
      'STREAK_EVALUATION_FAILED',
    );
  }
}
