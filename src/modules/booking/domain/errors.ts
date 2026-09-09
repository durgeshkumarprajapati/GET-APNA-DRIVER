import { BookingStatus, AssignmentAttemptStatus } from '@prisma/client';

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
