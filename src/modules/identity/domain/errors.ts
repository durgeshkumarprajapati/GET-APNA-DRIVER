import { AppError } from '@/shared/errors/app-error';
import type { AccountStatus } from './types';

export class UserNotFoundError extends AppError {
  constructor(userId: string) {
    super(`User not found: ${userId}`, 404, 'IDENTITY_USER_NOT_FOUND');
  }
}

export class DuplicateIdentityError extends AppError {
  constructor(providerName: string) {
    super(`An identity of type "${providerName}" is already in use`, 409, 'IDENTITY_DUPLICATE');
  }
}

export class InvalidAccountStatusTransitionError extends AppError {
  constructor(from: AccountStatus, to: AccountStatus) {
    super(
      `Cannot transition account status from ${from} to ${to}`,
      409,
      'IDENTITY_INVALID_STATUS_TRANSITION',
    );
  }
}

export class RoleNotFoundError extends AppError {
  constructor(roleCode: string) {
    super(`Role not found: ${roleCode}`, 404, 'IDENTITY_ROLE_NOT_FOUND');
  }
}

export class RoleNotAssignedError extends AppError {
  constructor(roleCode: string) {
    super(`Role is not currently assigned: ${roleCode}`, 409, 'IDENTITY_ROLE_NOT_ASSIGNED');
  }
}

export class SelfRoleEscalationError extends AppError {
  constructor() {
    super(
      'You cannot grant yourself the administrator role',
      403,
      'IDENTITY_SELF_ESCALATION_FORBIDDEN',
    );
  }
}

export class InvalidEmailError extends AppError {
  constructor() {
    super('Invalid email address', 422, 'IDENTITY_INVALID_EMAIL');
  }
}

export class InvalidPhoneNumberError extends AppError {
  constructor() {
    super(
      'Invalid phone number; expected E.164 format (e.g. +919876543210)',
      422,
      'IDENTITY_INVALID_PHONE',
    );
  }
}

export class UnauthenticatedError extends AppError {
  constructor() {
    super('Authentication is required', 401, 'UNAUTHENTICATED');
  }
}

export class AccountNotActiveError extends AppError {
  constructor(status: AccountStatus) {
    super(`Account is not active (status: ${status})`, 403, 'ACCOUNT_NOT_ACTIVE');
  }
}

export class ForbiddenError extends AppError {
  constructor(message = 'You do not have permission to perform this action') {
    super(message, 403, 'FORBIDDEN');
  }
}

export class InvalidCredentialsError extends AppError {
  constructor() {
    super('Invalid credentials', 401, 'IDENTITY_INVALID_CREDENTIALS');
  }
}

export class InvalidTokenError extends AppError {
  constructor() {
    super('Invalid or already used token', 400, 'IDENTITY_INVALID_TOKEN');
  }
}

export class TokenExpiredError extends AppError {
  constructor() {
    super('Token has expired', 400, 'IDENTITY_TOKEN_EXPIRED');
  }
}

export class OtpInvalidError extends AppError {
  constructor() {
    super('Invalid OTP code', 400, 'IDENTITY_OTP_INVALID');
  }
}

export class OtpExpiredError extends AppError {
  constructor() {
    super('OTP code has expired', 400, 'IDENTITY_OTP_EXPIRED');
  }
}

export class OtpMaxAttemptsExceededError extends AppError {
  constructor() {
    super('Maximum OTP verification attempts exceeded', 429, 'IDENTITY_OTP_MAX_ATTEMPTS');
  }
}

export class RateLimitExceededError extends AppError {
  constructor(message = 'Too many requests; please try again later') {
    super(message, 429, 'RATE_LIMIT_EXCEEDED');
  }
}

export class InvalidPasswordPolicyError extends AppError {
  constructor(issues: string[]) {
    super(`Password policy check failed: ${issues.join('; ')}`, 422, 'IDENTITY_INVALID_PASSWORD');
  }
}
