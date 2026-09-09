import { ReviewStatus } from '@prisma/client';
import { InvalidReviewModerationTransitionError } from './errors';

/**
 * Moderation lifecycle. Every transition is reversible (no destructive
 * terminal state) per the "avoid destructive deletion" moderation policy —
 * a REJECTED or HIDDEN review can always be restored to PUBLISHED.
 */
const VALID_TRANSITIONS: Record<ReviewStatus, readonly ReviewStatus[]> = {
  [ReviewStatus.PUBLISHED]: [ReviewStatus.FLAGGED, ReviewStatus.HIDDEN, ReviewStatus.REJECTED],
  [ReviewStatus.FLAGGED]: [ReviewStatus.PUBLISHED, ReviewStatus.HIDDEN, ReviewStatus.REJECTED],
  [ReviewStatus.HIDDEN]: [ReviewStatus.PUBLISHED, ReviewStatus.REJECTED],
  [ReviewStatus.REJECTED]: [ReviewStatus.PUBLISHED, ReviewStatus.HIDDEN],
};

/**
 * Validates a proposed review moderation transition.
 * Throws InvalidReviewModerationTransitionError if disallowed.
 */
export function validateReviewModerationTransition(
  currentStatus: ReviewStatus,
  targetStatus: ReviewStatus,
): void {
  if (currentStatus === targetStatus) return; // Idempotent no-op transition

  const allowed = VALID_TRANSITIONS[currentStatus] || [];
  if (!allowed.includes(targetStatus)) {
    throw new InvalidReviewModerationTransitionError(currentStatus, targetStatus);
  }
}

/** Only PUBLISHED reviews count toward the public DriverRatingSummary aggregate. */
export function isCountedInAggregate(status: ReviewStatus): boolean {
  return status === ReviewStatus.PUBLISHED;
}
