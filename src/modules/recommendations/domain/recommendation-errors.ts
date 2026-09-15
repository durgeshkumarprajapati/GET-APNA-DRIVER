import { AppError } from '@/shared/errors/app-error';

export class RecommendationGenerationError extends AppError {
  constructor(message = 'Failed to generate recommendations for customer.') {
    super(message, 500, 'RECOMMENDATION_GENERATION_FAILED');
  }
}

export class InvalidRecommendationLimitError extends AppError {
  constructor(limit: number) {
    super(
      `Recommendation limit '${limit}' must be between 1 and 10.`,
      400,
      'INVALID_RECOMMENDATION_LIMIT',
    );
  }
}
