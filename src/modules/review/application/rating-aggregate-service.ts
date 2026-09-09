import 'server-only';
import { prisma, type Db } from '@/shared/database/prisma';

interface StarBuckets {
  five: number;
  four: number;
  three: number;
  two: number;
  one: number;
}

function starBucketsFor(rating: number): StarBuckets {
  return {
    five: rating === 5 ? 1 : 0,
    four: rating === 4 ? 1 : 0,
    three: rating === 3 ? 1 : 0,
    two: rating === 2 ? 1 : 0,
    one: rating === 1 ? 1 : 0,
  };
}

/**
 * Adds one PUBLISHED-counted rating to a driver's aggregate. Must be called
 * with the same transaction client used for the Review row it accounts for.
 *
 * A single INSERT ... ON CONFLICT DO UPDATE is the only write here — there is
 * no read-then-recompute-then-write in application code, so two concurrent
 * submissions for the same driver can never race: Postgres serializes them
 * via the row's own lock, and the average is recomputed from the
 * already-updated totals within the same statement.
 */
export async function incrementRatingAggregate(
  db: Db,
  driverProfileId: string,
  rating: number,
): Promise<void> {
  const buckets = starBucketsFor(rating);

  await db.$executeRaw`
    INSERT INTO driver_rating_summaries (
      id, driver_profile_id, total_reviews, rating_sum, average_rating,
      five_star_count, four_star_count, three_star_count, two_star_count, one_star_count,
      updated_at
    )
    VALUES (
      gen_random_uuid(), ${driverProfileId}, 1, ${rating}, ${rating}::decimal,
      ${buckets.five}, ${buckets.four}, ${buckets.three}, ${buckets.two}, ${buckets.one},
      now()
    )
    ON CONFLICT (driver_profile_id) DO UPDATE SET
      total_reviews = driver_rating_summaries.total_reviews + 1,
      rating_sum = driver_rating_summaries.rating_sum + ${rating},
      average_rating = ROUND(
        (driver_rating_summaries.rating_sum + ${rating})::decimal
          / (driver_rating_summaries.total_reviews + 1),
        2
      ),
      five_star_count = driver_rating_summaries.five_star_count + ${buckets.five},
      four_star_count = driver_rating_summaries.four_star_count + ${buckets.four},
      three_star_count = driver_rating_summaries.three_star_count + ${buckets.three},
      two_star_count = driver_rating_summaries.two_star_count + ${buckets.two},
      one_star_count = driver_rating_summaries.one_star_count + ${buckets.one},
      updated_at = now();
  `;
}

/**
 * Removes one previously-PUBLISHED-counted rating from a driver's aggregate
 * (e.g. a moderation action hides/rejects a review that was counted). Must
 * be called with the same transaction client used for the Review status
 * change it accounts for. The summary row is guaranteed to already exist
 * whenever this is called, since a review can only leave PUBLISHED after
 * having been counted by incrementRatingAggregate.
 */
export async function decrementRatingAggregate(
  db: Db,
  driverProfileId: string,
  rating: number,
): Promise<void> {
  const buckets = starBucketsFor(rating);

  await db.$executeRaw`
    UPDATE driver_rating_summaries SET
      total_reviews = total_reviews - 1,
      rating_sum = rating_sum - ${rating},
      average_rating = CASE
        WHEN total_reviews - 1 <= 0 THEN 0
        ELSE ROUND((rating_sum - ${rating})::decimal / (total_reviews - 1), 2)
      END,
      five_star_count = five_star_count - ${buckets.five},
      four_star_count = four_star_count - ${buckets.four},
      three_star_count = three_star_count - ${buckets.three},
      two_star_count = two_star_count - ${buckets.two},
      one_star_count = one_star_count - ${buckets.one},
      updated_at = now()
    WHERE driver_profile_id = ${driverProfileId};
  `;
}

export interface RatingDistribution {
  5: number;
  4: number;
  3: number;
  2: number;
  1: number;
}

export interface DriverRatingSummaryView {
  driverProfileId: string;
  totalReviews: number;
  averageRating: number;
  distribution: RatingDistribution;
}

const EMPTY_SUMMARY: Omit<DriverRatingSummaryView, 'driverProfileId'> = {
  totalReviews: 0,
  averageRating: 0,
  distribution: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 },
};

/** Read-only. Returns a zeroed summary if the driver has no reviews yet. */
export async function getDriverRatingSummary(
  driverProfileId: string,
  db: Db = prisma,
): Promise<DriverRatingSummaryView> {
  const summary = await db.driverRatingSummary.findUnique({ where: { driverProfileId } });
  if (!summary) {
    return { driverProfileId, ...EMPTY_SUMMARY };
  }

  return {
    driverProfileId,
    totalReviews: summary.totalReviews,
    averageRating: Number(summary.averageRating),
    distribution: {
      5: summary.fiveStarCount,
      4: summary.fourStarCount,
      3: summary.threeStarCount,
      2: summary.twoStarCount,
      1: summary.oneStarCount,
    },
  };
}
