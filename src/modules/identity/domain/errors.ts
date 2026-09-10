import { AppError } from '@/shared/errors/app-error';
import type { AccountStatus } from './types';

export class UserNotFoundError extends AppError {
  constructor(userId: string) {
    super(`User not found: ${userId}`, 404, 'IDENTITY_USER_NOT_FOUND');
  }
}

export class DuplicateIdentityError extends AppError {
  constructor(providerName: string) {
    super(`This ${providerName} is already registered`, 409, 'IDENTITY_DUPLICATE');
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

export class LastAdministratorError extends AppError {
  constructor() {
    super(
      'Cannot revoke the ADMINISTRATOR role from the last remaining administrator',
      409,
      'IDENTITY_LAST_ADMINISTRATOR',
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

/**
 * Selecting CUSTOMER/DRIVER is only meaningful for a session that has no
 * role yet — this is the tamper/replay guard for /api/auth/role-selection:
 * once a role exists (assigned at registration, or by a prior selection),
 * re-submitting a different role is always rejected, never silently
 * applied. This is also what makes role selection impossible to use for
 * privilege escalation on an already-provisioned account.
 */
export class RoleAlreadyAssignedError extends AppError {
  constructor() {
    super(
      'A role has already been assigned to this account',
      409,
      'IDENTITY_ROLE_ALREADY_ASSIGNED',
    );
  }
}

/**
 * Thrown for any role value other than CUSTOMER or DRIVER — in particular,
 * this is what guarantees a client can never self-assign ADMINISTRATOR
 * through this endpoint. Zod at the route layer already narrows the type;
 * this is the defense-in-depth service-layer check.
 */
export class InvalidRoleSelectionError extends AppError {
  constructor(role: string) {
    super(`"${role}" is not a selectable role`, 400, 'IDENTITY_INVALID_ROLE_SELECTION');
  }
}

export class GoogleOAuthStateMismatchError extends AppError {
  constructor() {
    super('OAuth state is missing, expired, or does not match', 400, 'GOOGLE_OAUTH_STATE_MISMATCH');
  }
}

export class GoogleOAuthNotConfiguredError extends AppError {
  constructor() {
    super(
      'Google sign-in is not configured in this environment',
      503,
      'GOOGLE_OAUTH_NOT_CONFIGURED',
    );
  }
}

export class GoogleOAuthExchangeFailedError extends AppError {
  constructor(reason: string) {
    super(`Google sign-in failed: ${reason}`, 502, 'GOOGLE_OAUTH_EXCHANGE_FAILED');
  }
}
