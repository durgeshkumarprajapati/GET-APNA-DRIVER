import { ReviewStatus } from '@prisma/client';
import {
  isCountedInAggregate,
  validateReviewModerationTransition,
} from '@/modules/review/domain/review-moderation-state-machine';
import { InvalidReviewModerationTransitionError } from '@/modules/review/domain/errors';

describe('validateReviewModerationTransition', () => {
  it('allows PUBLISHED -> FLAGGED, HIDDEN, and REJECTED', () => {
    for (const target of [ReviewStatus.FLAGGED, ReviewStatus.HIDDEN, ReviewStatus.REJECTED]) {
      expect(() =>
        validateReviewModerationTransition(ReviewStatus.PUBLISHED, target),
      ).not.toThrow();
    }
  });

  it('allows every non-PUBLISHED status to be restored to PUBLISHED', () => {
    for (const current of [ReviewStatus.FLAGGED, ReviewStatus.HIDDEN, ReviewStatus.REJECTED]) {
      expect(() =>
        validateReviewModerationTransition(current, ReviewStatus.PUBLISHED),
      ).not.toThrow();
    }
  });

  it('is idempotent for a no-op transition', () => {
    expect(() =>
      validateReviewModerationTransition(ReviewStatus.HIDDEN, ReviewStatus.HIDDEN),
    ).not.toThrow();
  });

  it('rejects HIDDEN -> FLAGGED (not a defined transition)', () => {
    expect(() =>
      validateReviewModerationTransition(ReviewStatus.HIDDEN, ReviewStatus.FLAGGED),
    ).toThrow(InvalidReviewModerationTransitionError);
  });

  it('rejects REJECTED -> FLAGGED (not a defined transition)', () => {
    expect(() =>
      validateReviewModerationTransition(ReviewStatus.REJECTED, ReviewStatus.FLAGGED),
    ).toThrow(InvalidReviewModerationTransitionError);
  });
});

describe('isCountedInAggregate', () => {
  it('only PUBLISHED counts toward the public rating aggregate', () => {
    expect(isCountedInAggregate(ReviewStatus.PUBLISHED)).toBe(true);
    expect(isCountedInAggregate(ReviewStatus.FLAGGED)).toBe(false);
    expect(isCountedInAggregate(ReviewStatus.HIDDEN)).toBe(false);
    expect(isCountedInAggregate(ReviewStatus.REJECTED)).toBe(false);
  });
});
