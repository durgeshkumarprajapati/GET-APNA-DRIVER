import { AppError } from '@/shared/errors/app-error';
import type { DriverCouponStatus } from './driver-coupon-types';

export class DriverCouponNotFoundError extends AppError {
  constructor(identifier: string) {
    super(`Driver coupon not found: ${identifier}`, 404, 'DRIVER_COUPON_NOT_FOUND');
  }
}

export class DriverCouponCodeAlreadyExistsError extends AppError {
  constructor(code: string) {
    super(
      `A driver coupon with code ${code} already exists`,
      409,
      'DRIVER_COUPON_CODE_ALREADY_EXISTS',
    );
  }
}

export class InvalidDriverCouponConfigError extends AppError {
  constructor(message: string) {
    super(message, 400, 'DRIVER_COUPON_INVALID_CONFIG');
  }
}

export class InvalidDriverCouponStatusTransitionError extends AppError {
  constructor(from: DriverCouponStatus, to: DriverCouponStatus) {
    super(
      `Invalid driver coupon status transition from ${from} to ${to}`,
      409,
      'DRIVER_COUPON_INVALID_STATUS_TRANSITION',
    );
  }
}

export class DriverCouponNotEditableError extends AppError {
  constructor(status: DriverCouponStatus) {
    super(
      `Driver coupon in status ${status} can no longer be edited`,
      409,
      'DRIVER_COUPON_NOT_EDITABLE',
    );
  }
}

export class DriverCouponNotActiveError extends AppError {
  constructor(code: string) {
    super(`Coupon ${code} is not currently active`, 409, 'DRIVER_COUPON_NOT_ACTIVE');
  }
}

export class DriverCouponExpiredError extends AppError {
  constructor(code: string) {
    super(`Coupon ${code} has expired`, 409, 'DRIVER_COUPON_EXPIRED');
  }
}

export class DriverCouponNotYetStartedError extends AppError {
  constructor(code: string) {
    super(`Coupon ${code} is not yet active`, 409, 'DRIVER_COUPON_NOT_STARTED');
  }
}

export class DriverCouponUsageLimitReachedError extends AppError {
  constructor(code: string) {
    super(`Coupon ${code} has reached its usage limit`, 409, 'DRIVER_COUPON_USAGE_LIMIT_REACHED');
  }
}

export class DriverCouponAlreadyRedeemedError extends AppError {
  constructor(code: string) {
    super(`You have already redeemed coupon ${code}`, 409, 'DRIVER_COUPON_ALREADY_REDEEMED');
  }
}
