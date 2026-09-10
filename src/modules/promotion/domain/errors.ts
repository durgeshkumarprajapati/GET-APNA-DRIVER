import { AppError } from '@/shared/errors/app-error';
import type { PromotionStatus } from './types';

export class PromotionNotFoundError extends AppError {
  constructor(identifier: string) {
    super(`Promotion not found: ${identifier}`, 404, 'PROMOTION_NOT_FOUND');
  }
}

export class PromotionCodeAlreadyExistsError extends AppError {
  constructor(code: string) {
    super(`A promotion with code ${code} already exists`, 409, 'PROMOTION_CODE_ALREADY_EXISTS');
  }
}

export class InvalidPromotionConfigError extends AppError {
  constructor(message: string) {
    super(message, 400, 'PROMOTION_INVALID_CONFIG');
  }
}

export class InvalidPromotionStatusTransitionError extends AppError {
  constructor(from: PromotionStatus, to: PromotionStatus) {
    super(
      `Invalid promotion status transition from ${from} to ${to}`,
      409,
      'PROMOTION_INVALID_STATUS_TRANSITION',
    );
  }
}

export class PromotionNotEditableError extends AppError {
  constructor(status: PromotionStatus) {
    super(`Promotion in status ${status} can no longer be edited`, 409, 'PROMOTION_NOT_EDITABLE');
  }
}

export class PromotionCodeRequiredError extends AppError {
  constructor() {
    super('This promotion requires a code', 400, 'PROMOTION_CODE_REQUIRED');
  }
}

export class PromotionNotActiveError extends AppError {
  constructor(identifier: string) {
    super(`Promotion ${identifier} is not currently active`, 409, 'PROMOTION_NOT_ACTIVE');
  }
}

export class PromotionExpiredError extends AppError {
  constructor(identifier: string) {
    super(`Promotion ${identifier} has expired`, 409, 'PROMOTION_EXPIRED');
  }
}

export class PromotionNotYetStartedError extends AppError {
  constructor(identifier: string) {
    super(`Promotion ${identifier} is not yet active`, 409, 'PROMOTION_NOT_STARTED');
  }
}

export class PromotionMinimumBookingValueNotMetError extends AppError {
  constructor(minBookingValue: string, fareAmount: string) {
    super(
      `This promotion requires a minimum fare of ${minBookingValue}, but the fare is ${fareAmount}`,
      409,
      'PROMOTION_MINIMUM_BOOKING_VALUE_NOT_MET',
    );
  }
}

export class PromotionFirstRideOnlyError extends AppError {
  constructor() {
    super(
      'This promotion is only available on your first completed ride',
      409,
      'PROMOTION_FIRST_RIDE_ONLY',
    );
  }
}

export class PromotionUsageLimitReachedError extends AppError {
  constructor(identifier: string) {
    super(
      `Promotion ${identifier} has reached its usage limit`,
      409,
      'PROMOTION_USAGE_LIMIT_REACHED',
    );
  }
}

export class PromotionPerUserUsageLimitReachedError extends AppError {
  constructor(identifier: string) {
    super(
      `You have already used promotion ${identifier} the maximum number of times`,
      409,
      'PROMOTION_PER_USER_USAGE_LIMIT_REACHED',
    );
  }
}

export class PromotionAlreadyAppliedToBookingError extends AppError {
  constructor(bookingId: string) {
    super(
      `Booking ${bookingId} already has a promotion applied`,
      409,
      'PROMOTION_ALREADY_APPLIED_TO_BOOKING',
    );
  }
}
