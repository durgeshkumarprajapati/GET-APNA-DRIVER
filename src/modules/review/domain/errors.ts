import { BookingStatus, ReviewStatus } from '@prisma/client';

export class ReviewNotFoundError extends Error {
  constructor(identifier: string) {
    super(`Review not found: ${identifier}`);
    this.name = 'ReviewNotFoundError';
  }
}

export class BookingNotEligibleForReviewError extends Error {
  constructor(bookingId: string, currentStatus: BookingStatus) {
    super(
      `Booking ${bookingId} is not eligible for a review (status: ${currentStatus}; requires TRIP_COMPLETED).`,
    );
    this.name = 'BookingNotEligibleForReviewError';
  }
}

export class DuplicateReviewError extends Error {
  constructor(bookingId: string) {
    super(`Booking ${bookingId} has already been reviewed.`);
    this.name = 'DuplicateReviewError';
  }
}

export class InvalidReviewModerationTransitionError extends Error {
  constructor(currentStatus: ReviewStatus, targetStatus: ReviewStatus) {
    super(`Invalid review moderation transition from ${currentStatus} to ${targetStatus}.`);
    this.name = 'InvalidReviewModerationTransitionError';
  }
}
