import { AppError } from '@/shared/errors/app-error';

export class LoyaltyAccountNotFoundError extends AppError {
  constructor(identifier: string) {
    super(`Loyalty account not found: ${identifier}`, 404, 'LOYALTY_ACCOUNT_NOT_FOUND');
  }
}

export class InsufficientLoyaltyPointsError extends AppError {
  constructor(required: number, available: number) {
    super(
      `Insufficient loyalty points. Required: ${required}, Available: ${available}`,
      400,
      'INSUFFICIENT_LOYALTY_POINTS',
    );
  }
}

export class RewardNotFoundError extends AppError {
  constructor(rewardId: string) {
    super(`Loyalty reward not found: ${rewardId}`, 404, 'LOYALTY_REWARD_NOT_FOUND');
  }
}

export class RewardNotActiveError extends AppError {
  constructor(rewardId: string) {
    super(`Loyalty reward is not active: ${rewardId}`, 400, 'LOYALTY_REWARD_NOT_ACTIVE');
  }
}

export class RewardTierNotMetError extends AppError {
  constructor(requiredTier: string, currentTier: string) {
    super(
      `Reward requires ${requiredTier} tier, but customer is on ${currentTier} tier`,
      403,
      'LOYALTY_REWARD_TIER_NOT_MET',
    );
  }
}

export class RewardLimitExceededError extends AppError {
  constructor(message: string = 'Redemption limit reached for this reward') {
    super(message, 409, 'LOYALTY_REWARD_LIMIT_EXCEEDED');
  }
}

export class DuplicateRedemptionError extends AppError {
  constructor(idempotencyKey: string) {
    super(`Duplicate redemption request for idempotency key ${idempotencyKey}`, 409, 'LOYALTY_DUPLICATE_REDEMPTION');
  }
}
