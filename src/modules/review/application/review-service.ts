import 'server-only';
import { BookingStatus, Prisma, Review, ReviewStatus } from '@prisma/client';
import { prisma, type Db } from '@/shared/database/prisma';
import { recordAuditLog } from '@/shared/audit/audit-service';
import { insertOutboxEvent } from '@/shared/outbox/outbox-service';
import { requirePermission } from '@/modules/identity/authorization/authorization-service';
import { PERMISSIONS } from '@/modules/identity/domain/permission-catalog';
import type { AuthenticatedPrincipal } from '@/modules/identity/domain/types';
import { getContactInfoForUsers } from '@/modules/identity/infrastructure/user-repository';
import { BookingNotFoundError } from '@/modules/booking/domain/errors';
import {
  BookingNotEligibleForReviewError,
  DuplicateReviewError,
  ReviewNotFoundError,
} from '../domain/errors';
import {
  isCountedInAggregate,
  validateReviewModerationTransition,
} from '../domain/review-moderation-state-machine';
import { decrementRatingAggregate, incrementRatingAggregate } from './rating-aggregate-service';

const MAX_PAGE_SIZE = 100;
const DEFAULT_PAGE_SIZE = 20;

function resolvePagination(page?: number, pageSize?: number): { page: number; pageSize: number } {
  return {
    page: page && page > 0 ? page : 1,
    pageSize: pageSize && pageSize > 0 ? Math.min(pageSize, MAX_PAGE_SIZE) : DEFAULT_PAGE_SIZE,
  };
}

export interface CreateReviewInput {
  bookingId: string;
  customerUserId: string;
  rating: number;
  comment?: string | null;
}

/**
 * Customer submits a review for a completed trip. Eligibility (booking
 * ownership + TRIP_COMPLETED status) is re-checked here against the
 * database regardless of what the client claims; the unique constraint on
 * Review.bookingId is the final, database-level defense against a duplicate
 * submission racing this check.
 */
export async function createReview(input: CreateReviewInput, db: Db = prisma): Promise<Review> {
  const { bookingId, customerUserId, rating, comment } = input;
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    throw new Error('rating must be an integer between 1 and 5.');
  }

  try {
    return await db.$transaction(async (tx) => {
      const booking = await tx.booking.findUnique({ where: { id: bookingId } });
      if (!booking || booking.customerId !== customerUserId) {
        // Not-found rather than forbidden: avoids leaking booking existence
        // to a caller who does not own it (same pattern as the driver
        // journey service's ownership check).
        throw new BookingNotFoundError(bookingId);
      }
      if (booking.status !== BookingStatus.TRIP_COMPLETED || !booking.driverProfileId) {
        throw new BookingNotEligibleForReviewError(bookingId, booking.status);
      }

      const review = await tx.review.create({
        data: {
          bookingId,
          customerId: customerUserId,
          driverProfileId: booking.driverProfileId,
          rating,
          comment: comment ?? null,
          status: ReviewStatus.PUBLISHED,
        },
      });

      await incrementRatingAggregate(tx, booking.driverProfileId, rating);

      await recordAuditLog(tx, {
        actorUserId: customerUserId,
        action: 'review.created',
        entityType: 'Review',
        entityId: review.id,
        afterState: { bookingId, driverProfileId: booking.driverProfileId, rating },
      });

      await insertOutboxEvent(tx, {
        eventType: 'review.created',
        aggregateType: 'Review',
        aggregateId: review.id,
        payload: {
          reviewId: review.id,
          bookingId,
          driverProfileId: booking.driverProfileId,
          customerUserId,
          rating,
        },
      });

      return review;
    });
  } catch (err: unknown) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
      throw new DuplicateReviewError(bookingId);
    }
    throw err;
  }
}

export interface ReviewView {
  id: string;
  bookingId: string;
  rating: number;
  comment: string | null;
  status: ReviewStatus;
  createdAt: Date;
  customer: { id: string; email: string | null; phoneNumber: string | null };
  driverProfileId: string;
}

function toReviewView(
  review: Review,
  contact: { email: string | null; phoneNumber: string | null },
): ReviewView {
  return {
    id: review.id,
    bookingId: review.bookingId,
    rating: review.rating,
    comment: review.comment,
    status: review.status,
    createdAt: review.createdAt,
    customer: { id: review.customerId, ...contact },
    driverProfileId: review.driverProfileId,
  };
}

/**
 * Read a booking's review for either the customer who owns the booking or
 * the driver who was assigned to it. Returns null if no review exists yet
 * (not an error — the caller decides how to render "not yet reviewed").
 */
export async function getReviewForBooking(
  userId: string,
  bookingId: string,
  db: Db = prisma,
): Promise<ReviewView | null> {
  const booking = await db.booking.findUnique({
    where: { id: bookingId },
    include: { driverProfile: true },
  });
  if (!booking) {
    throw new BookingNotFoundError(bookingId);
  }
  const isOwnerCustomer = booking.customerId === userId;
  const isAssignedDriver = booking.driverProfile?.userId === userId;
  if (!isOwnerCustomer && !isAssignedDriver) {
    throw new BookingNotFoundError(bookingId);
  }

  const review = await db.review.findUnique({ where: { bookingId } });
  if (!review) return null;

  const contactInfo = await getContactInfoForUsers(db, [review.customerId]);
  return toReviewView(
    review,
    contactInfo.get(review.customerId) ?? { email: null, phoneNumber: null },
  );
}

export interface ListOwnCustomerReviewsResult {
  reviews: ReviewView[];
  total: number;
  page: number;
  pageSize: number;
}

/** Customer's own review history, across all their submitted reviews. */
export async function listOwnCustomerReviews(
  customerUserId: string,
  pagination: { page?: number; pageSize?: number } = {},
  db: Db = prisma,
): Promise<ListOwnCustomerReviewsResult> {
  const { page, pageSize } = resolvePagination(pagination.page, pagination.pageSize);
  const where: Prisma.ReviewWhereInput = { customerId: customerUserId };

  const [reviews, total] = await Promise.all([
    db.review.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    db.review.count({ where }),
  ]);

  const contactInfo = await getContactInfoForUsers(db, [customerUserId]);
  const contact = contactInfo.get(customerUserId) ?? { email: null, phoneNumber: null };

  return {
    reviews: reviews.map((review) => toReviewView(review, contact)),
    total,
    page,
    pageSize,
  };
}

export interface ListDriverReviewsFilter {
  minRating?: number;
  page?: number;
  pageSize?: number;
}

export interface ListDriverReviewsResult {
  reviews: ReviewView[];
  total: number;
  page: number;
  pageSize: number;
}

/**
 * Driver's own received reviews — all statuses are visible to the driver
 * themselves (transparency into moderation outcomes), not just PUBLISHED.
 */
export async function listDriverReviews(
  driverProfileId: string,
  filter: ListDriverReviewsFilter = {},
  db: Db = prisma,
): Promise<ListDriverReviewsResult> {
  const { page, pageSize } = resolvePagination(filter.page, filter.pageSize);
  const where: Prisma.ReviewWhereInput = {
    driverProfileId,
    ...(filter.minRating ? { rating: { gte: filter.minRating } } : {}),
  };

  const [reviews, total] = await Promise.all([
    db.review.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    db.review.count({ where }),
  ]);

  const contactInfo = await getContactInfoForUsers(
    db,
    reviews.map((review) => review.customerId),
  );

  return {
    reviews: reviews.map((review) =>
      toReviewView(
        review,
        contactInfo.get(review.customerId) ?? { email: null, phoneNumber: null },
      ),
    ),
    total,
    page,
    pageSize,
  };
}

export interface AdminListReviewsFilter {
  status?: ReviewStatus;
  minRating?: number;
  maxRating?: number;
  driverProfileId?: string;
  customerId?: string;
  search?: string;
  page?: number;
  pageSize?: number;
}

export interface AdminReviewSummary extends ReviewView {
  driver: { id: string; name: string };
}

export interface AdminListReviewsResult {
  reviews: AdminReviewSummary[];
  total: number;
  page: number;
  pageSize: number;
}

function driverDisplayName(profile: {
  displayName: string | null;
  firstName: string | null;
  lastName: string | null;
}): string {
  if (profile.displayName) return profile.displayName;
  const combined = [profile.firstName, profile.lastName].filter(Boolean).join(' ');
  return combined || 'Unnamed Driver';
}

/** Admin-facing review directory. Read-only. */
export async function listAdminReviews(
  filter: AdminListReviewsFilter = {},
  db: Db = prisma,
): Promise<AdminListReviewsResult> {
  const { page, pageSize } = resolvePagination(filter.page, filter.pageSize);

  const where: Prisma.ReviewWhereInput = {
    ...(filter.status ? { status: filter.status } : {}),
    ...(filter.driverProfileId ? { driverProfileId: filter.driverProfileId } : {}),
    ...(filter.customerId ? { customerId: filter.customerId } : {}),
    ...(filter.minRating || filter.maxRating
      ? {
          rating: {
            ...(filter.minRating ? { gte: filter.minRating } : {}),
            ...(filter.maxRating ? { lte: filter.maxRating } : {}),
          },
        }
      : {}),
    ...(filter.search
      ? { comment: { contains: filter.search, mode: 'insensitive' as const } }
      : {}),
  };

  const [reviews, total] = await Promise.all([
    db.review.findMany({
      where,
      include: { driverProfile: true },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    db.review.count({ where }),
  ]);

  const contactInfo = await getContactInfoForUsers(
    db,
    reviews.map((review) => review.customerId),
  );

  return {
    reviews: reviews.map((review) => ({
      ...toReviewView(
        review,
        contactInfo.get(review.customerId) ?? { email: null, phoneNumber: null },
      ),
      driver: { id: review.driverProfile.id, name: driverDisplayName(review.driverProfile) },
    })),
    total,
    page,
    pageSize,
  };
}

/** Admin-facing single-review detail. Read-only. */
export async function getAdminReviewDetail(
  reviewId: string,
  db: Db = prisma,
): Promise<AdminReviewSummary> {
  const review = await db.review.findUnique({
    where: { id: reviewId },
    include: { driverProfile: true },
  });
  if (!review) {
    throw new ReviewNotFoundError(reviewId);
  }

  const contactInfo = await getContactInfoForUsers(db, [review.customerId]);
  return {
    ...toReviewView(
      review,
      contactInfo.get(review.customerId) ?? { email: null, phoneNumber: null },
    ),
    driver: { id: review.driverProfile.id, name: driverDisplayName(review.driverProfile) },
  };
}

export interface ModerateReviewInput {
  reviewId: string;
  actor: AuthenticatedPrincipal;
  targetStatus: ReviewStatus;
  reason: string;
}

/**
 * Admin moderation action. Adjusts the driver's rating aggregate in the same
 * transaction whenever the review crosses in or out of the PUBLISHED
 * (counted) state, so the aggregate is never out of sync with what is
 * actually visible. Never deletes the review row — moderation only changes
 * `status`, preserving historical review data per the no-hard-deletion
 * policy.
 */
export async function moderateReview(
  input: ModerateReviewInput,
  db: Db = prisma,
): Promise<AdminReviewSummary> {
  const { reviewId, actor, targetStatus, reason } = input;
  requirePermission(actor, PERMISSIONS.REVIEWS_MANAGE);

  await db.$transaction(async (tx) => {
    const review = await tx.review.findUnique({ where: { id: reviewId } });
    if (!review) {
      throw new ReviewNotFoundError(reviewId);
    }

    validateReviewModerationTransition(review.status, targetStatus);
    if (review.status === targetStatus) {
      return; // Idempotent no-op — no aggregate change, no duplicate audit/outbox noise.
    }

    const wasCounted = isCountedInAggregate(review.status);
    const willBeCounted = isCountedInAggregate(targetStatus);

    await tx.review.update({
      where: { id: reviewId },
      data: {
        status: targetStatus,
        moderationReason: reason,
        moderatedBy: actor.userId,
        moderatedAt: new Date(),
      },
    });

    if (wasCounted && !willBeCounted) {
      await decrementRatingAggregate(tx, review.driverProfileId, review.rating);
    } else if (!wasCounted && willBeCounted) {
      await incrementRatingAggregate(tx, review.driverProfileId, review.rating);
    }

    await recordAuditLog(tx, {
      actorUserId: actor.userId,
      action: 'review.moderated',
      entityType: 'Review',
      entityId: reviewId,
      beforeState: { status: review.status },
      afterState: { status: targetStatus, reason },
    });

    await insertOutboxEvent(tx, {
      eventType: 'review.moderated',
      aggregateType: 'Review',
      aggregateId: reviewId,
      payload: {
        reviewId,
        customerUserId: review.customerId,
        previousStatus: review.status,
        newStatus: targetStatus,
        reason,
        moderatedBy: actor.userId,
      },
    });
  });

  return getAdminReviewDetail(reviewId, db);
}
