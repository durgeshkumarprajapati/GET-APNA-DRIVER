import { BookingStatus, AssignmentAttemptStatus, BookingType } from '@prisma/client';
import { AppError } from '@/shared/errors/app-error';

export class BookingNotFoundError extends Error {
  constructor(identifier: string) {
    super(`Booking not found: ${identifier}`);
    this.name = 'BookingNotFoundError';
  }
}

export class InvalidBookingStatusTransitionError extends Error {
  constructor(currentStatus: BookingStatus, targetStatus: BookingStatus) {
    super(`Invalid booking status transition from ${currentStatus} to ${targetStatus}.`);
    this.name = 'InvalidBookingStatusTransitionError';
  }
}

export class AssignmentAttemptNotFoundError extends Error {
  constructor(attemptId: string) {
    super(`Assignment attempt not found: ${attemptId}`);
    this.name = 'AssignmentAttemptNotFoundError';
  }
}

export class AssignmentOfferExpiredError extends Error {
  constructor(attemptId: string) {
    super(`Assignment offer ${attemptId} has expired.`);
    this.name = 'AssignmentOfferExpiredError';
  }
}

export class AssignmentAlreadyRespondedError extends Error {
  constructor(attemptId: string, currentStatus: AssignmentAttemptStatus) {
    super(
      `Assignment offer ${attemptId} has already been responded to (status: ${currentStatus}).`,
    );
    this.name = 'AssignmentAlreadyRespondedError';
  }
}

export class BookingAlreadyAssignedError extends Error {
  constructor(bookingId: string) {
    super(`Booking ${bookingId} is already assigned to a driver.`);
    this.name = 'BookingAlreadyAssignedError';
  }
}

export class BookingNotCancellableError extends Error {
  constructor(bookingId: string, currentStatus: BookingStatus) {
    super(`Booking ${bookingId} cannot be cancelled from current status: ${currentStatus}.`);
    this.name = 'BookingNotCancellableError';
  }
}

export class DuplicateBookingIdempotencyError extends Error {
  constructor(idempotencyKey: string) {
    super(`Booking creation with idempotency key '${idempotencyKey}' already processed.`);
    this.name = 'DuplicateBookingIdempotencyError';
  }
}

export class DispatchInvalidBookingStateError extends Error {
  constructor(bookingId: string, currentStatus: BookingStatus, requiredStatuses: BookingStatus[]) {
    super(
      `Booking ${bookingId} is in ${currentStatus}; this dispatch action requires one of: ${requiredStatuses.join(', ')}.`,
    );
    this.name = 'DispatchInvalidBookingStateError';
  }
}

export class DriverNotEligibleForDispatchError extends Error {
  constructor(driverProfileId: string, reasons: string[]) {
    super(`Driver ${driverProfileId} is not eligible for assignment: ${reasons.join('; ')}`);
    this.name = 'DriverNotEligibleForDispatchError';
  }
}

export class DriverNotAvailableForDispatchError extends Error {
  constructor(driverProfileId: string, currentAvailabilityStatus: string) {
    super(
      `Driver ${driverProfileId} is not available for assignment (current status: ${currentAvailabilityStatus}).`,
    );
    this.name = 'DriverNotAvailableForDispatchError';
  }
}

export class InvalidRidePinError extends Error {
  constructor(message = 'Invalid ride PIN.') {
    super(message);
    this.name = 'InvalidRidePinError';
  }
}

export class MaxRidePinAttemptsExceededError extends Error {
  constructor() {
    super('Maximum ride PIN verification attempts exceeded for this booking.');
    this.name = 'MaxRidePinAttemptsExceededError';
  }
}

/**
 * DAILY/WEEKLY/MONTHLY bookings require the customer to pick a specific
 * driver (at that driver's own rate) up front — unlike every other booking
 * type, there is no platform-default-rate fallback for these three.
 */
export class DriverSelectionRequiredError extends AppError {
  constructor(bookingType: BookingType) {
    super(
      `A driver must be selected for ${bookingType} bookings.`,
      400,
      'DRIVER_SELECTION_REQUIRED',
    );
  }
}

/**
 * The customer's selected driver (for a DAILY/WEEKLY/MONTHLY hire) is no
 * longer a valid choice — not approved/available, has no rate set for this
 * hire type, or already has a conflicting hire booking for the requested
 * window. Thrown instead of silently substituting another driver, since
 * this booking type has no fallback (see matching-service.ts).
 */
export class SelectedDriverUnavailableError extends AppError {
  constructor(driverProfileId: string, reason: string) {
    super(
      `Selected driver ${driverProfileId} is not available: ${reason}`,
      400,
      'SELECTED_DRIVER_UNAVAILABLE',
    );
  }
}

/**
 * The caller is neither the booking's customer nor a driver associated with
 * it (assigned, or currently offered/preferred) — not-found rather than a
 * generic 403 would leak booking existence, but messaging has no separate
 * "does this booking exist" concern the way getBookingById does, so this is
 * a plain 403.
 */
export class MessagingNotAuthorizedError extends AppError {
  constructor(bookingId: string) {
    super(`Not authorized to message on booking ${bookingId}.`, 403, 'MESSAGING_NOT_AUTHORIZED');
  }
}

/**
 * The booking has reached a terminal state (CANCELLED/EXPIRED) where
 * starting a new message no longer makes sense — existing message history
 * remains readable, this only blocks sending new ones.
 */
export class MessagingNotAllowedError extends AppError {
  constructor(bookingId: string, status: BookingStatus) {
    super(
      `Cannot send a message on booking ${bookingId} in status ${status}.`,
      400,
      'MESSAGING_NOT_ALLOWED',
    );
  }
}
