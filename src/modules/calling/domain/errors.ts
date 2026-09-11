import { CallStatus } from '@prisma/client';

export class CallSessionNotFoundError extends Error {
  constructor(identifier: string) {
    super(`Call session not found: ${identifier}`);
    this.name = 'CallSessionNotFoundError';
  }
}

export class InvalidCallStateTransitionError extends Error {
  constructor(currentStatus: CallStatus, targetStatus: CallStatus) {
    super(`Invalid call status transition from ${currentStatus} to ${targetStatus}.`);
    this.name = 'InvalidCallStateTransitionError';
  }
}

export class CallAuthorizationError extends Error {
  constructor(message: string = 'Access denied to initiate or view call session.') {
    super(message);
    this.name = 'CallAuthorizationError';
  }
}

export class CallWindowExpiredError extends Error {
  constructor(message: string = 'Call window has expired for this booking.') {
    super(message);
    this.name = 'CallWindowExpiredError';
  }
}

export class ActiveCallAlreadyExistsError extends Error {
  constructor(sessionId: string) {
    super(`An active call session already exists: ${sessionId}`);
    this.name = 'ActiveCallAlreadyExistsError';
  }
}

export class TelephonyProviderError extends Error {
  constructor(message: string) {
    super(`Telephony provider error: ${message}`);
    this.name = 'TelephonyProviderError';
  }
}
