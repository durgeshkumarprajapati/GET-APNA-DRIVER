import { BookingStatus, Prisma, ReviewStatus } from '@prisma/client';
import {
  createReview,
  getReviewForBooking,
  moderateReview,
} from '@/modules/review/application/review-service';
import {
  BookingNotEligibleForReviewError,
  DuplicateReviewError,
  InvalidReviewModerationTransitionError,
} from '@/modules/review/domain/errors';
import { BookingNotFoundError } from '@/modules/booking/domain/errors';
import { ForbiddenError } from '@/modules/identity/domain/errors';
import { PERMISSIONS } from '@/modules/identity/domain/permission-catalog';
import { SYSTEM_ROLE_CODES } from '@/modules/identity/domain/role-catalog';
import type { AuthenticatedPrincipal } from '@/modules/identity/domain/types';
import { recordAuditLog } from '@/shared/audit/audit-service';
import { insertOutboxEvent } from '@/shared/outbox/outbox-service';
import {
  decrementRatingAggregate,
  incrementRatingAggregate,
} from '@/modules/review/application/rating-aggregate-service';
import { getContactInfoForUsers } from '@/modules/identity/infrastructure/user-repository';

const mockTx = {
  booking: { findUnique: jest.fn() },
  review: { create: jest.fn(), findUnique: jest.fn(), update: jest.fn() },
};

const mockDb = {
  $transaction: jest.fn((cb: (tx: unknown) => unknown) => cb(mockTx)),
  booking: { findUnique: jest.fn() },
  review: { findUnique: jest.fn() },
};

jest.mock('@/shared/database/prisma', () => ({ prisma: {} }));
jest.mock('@/shared/audit/audit-service', () => ({ recordAuditLog: jest.fn() }));
jest.mock('@/shared/outbox/outbox-service', () => ({ insertOutboxEvent: jest.fn() }));
jest.mock('@/modules/identity/infrastructure/user-repository', () => ({
  getContactInfoForUsers: jest.fn().mockResolvedValue(new Map()),
}));
jest.mock('@/modules/review/application/rating-aggregate-service', () => ({
  incrementRatingAggregate: jest.fn(),
  decrementRatingAggregate: jest.fn(),
}));

const adminPrincipal: AuthenticatedPrincipal = {
  userId: 'admin-1',
  accountStatus: 'ACTIVE',
  roles: [SYSTEM_ROLE_CODES.ADMINISTRATOR],
  permissions: [PERMISSIONS.REVIEWS_MANAGE],
};

const noPermissionPrincipal: AuthenticatedPrincipal = {
  userId: 'operator-1',
  accountStatus: 'ACTIVE',
  roles: [SYSTEM_ROLE_CODES.CUSTOMER],
  permissions: [],
};

describe('createReview', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockDb.$transaction.mockImplementation((cb: (tx: unknown) => unknown) => cb(mockTx));
  });

  it('creates a review when the customer owns a TRIP_COMPLETED booking', async () => {
    mockTx.booking.findUnique.mockResolvedValue({
      id: 'booking-1',
      customerId: 'customer-1',
      driverProfileId: 'driver-1',
      status: BookingStatus.TRIP_COMPLETED,
    });
    mockTx.review.create.mockResolvedValue({
      id: 'review-1',
      bookingId: 'booking-1',
      customerId: 'customer-1',
      driverProfileId: 'driver-1',
      rating: 5,
      comment: 'Great trip',
      status: ReviewStatus.PUBLISHED,
    });

    const review = await createReview(
      { bookingId: 'booking-1', customerUserId: 'customer-1', rating: 5, comment: 'Great trip' },
      mockDb as never,
    );

    expect(review.id).toBe('review-1');
    expect(incrementRatingAggregate).toHaveBeenCalledWith(mockTx, 'driver-1', 5);
    expect(recordAuditLog).toHaveBeenCalledWith(
      mockTx,
      expect.objectContaining({ action: 'review.created' }),
    );
    expect(insertOutboxEvent).toHaveBeenCalledWith(
      mockTx,
      expect.objectContaining({ eventType: 'review.created' }),
    );
  });

  it('rejects reviewing a booking that belongs to another customer', async () => {
    mockTx.booking.findUnique.mockResolvedValue({
      id: 'booking-1',
      customerId: 'someone-else',
      driverProfileId: 'driver-1',
      status: BookingStatus.TRIP_COMPLETED,
    });

    await expect(
      createReview(
        { bookingId: 'booking-1', customerUserId: 'customer-1', rating: 5 },
        mockDb as never,
      ),
    ).rejects.toBeInstanceOf(BookingNotFoundError);
    expect(mockTx.review.create).not.toHaveBeenCalled();
  });

  it('rejects reviewing a booking that has not reached TRIP_COMPLETED', async () => {
    mockTx.booking.findUnique.mockResolvedValue({
      id: 'booking-1',
      customerId: 'customer-1',
      driverProfileId: 'driver-1',
      status: BookingStatus.TRIP_IN_PROGRESS,
    });

    await expect(
      createReview(
        { bookingId: 'booking-1', customerUserId: 'customer-1', rating: 5 },
        mockDb as never,
      ),
    ).rejects.toBeInstanceOf(BookingNotEligibleForReviewError);
    expect(mockTx.review.create).not.toHaveBeenCalled();
  });

  it('rejects a rating outside 1-5 before touching the database', async () => {
    await expect(
      createReview(
        { bookingId: 'booking-1', customerUserId: 'customer-1', rating: 6 },
        mockDb as never,
      ),
    ).rejects.toThrow(/rating must be/);
    expect(mockDb.$transaction).not.toHaveBeenCalled();
  });

  it('translates a unique-constraint violation into DuplicateReviewError', async () => {
    mockTx.booking.findUnique.mockResolvedValue({
      id: 'booking-1',
      customerId: 'customer-1',
      driverProfileId: 'driver-1',
      status: BookingStatus.TRIP_COMPLETED,
    });
    mockTx.review.create.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
        code: 'P2002',
        clientVersion: 'test',
      }),
    );

    await expect(
      createReview(
        { bookingId: 'booking-1', customerUserId: 'customer-1', rating: 4 },
        mockDb as never,
      ),
    ).rejects.toBeInstanceOf(DuplicateReviewError);
  });
});

describe('getReviewForBooking', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns null when the booking has not been reviewed yet', async () => {
    mockDb.booking.findUnique.mockResolvedValue({
      id: 'booking-1',
      customerId: 'customer-1',
      driverProfile: { userId: 'driver-user-1' },
    });
    mockDb.review.findUnique.mockResolvedValue(null);

    const result = await getReviewForBooking('customer-1', 'booking-1', mockDb as never);
    expect(result).toBeNull();
  });

  it('rejects a caller who is neither the booking customer nor its assigned driver', async () => {
    mockDb.booking.findUnique.mockResolvedValue({
      id: 'booking-1',
      customerId: 'customer-1',
      driverProfile: { userId: 'driver-user-1' },
    });

    await expect(
      getReviewForBooking('some-other-user', 'booking-1', mockDb as never),
    ).rejects.toBeInstanceOf(BookingNotFoundError);
  });

  it('allows the assigned driver to read the review left on their own booking', async () => {
    mockDb.booking.findUnique.mockResolvedValue({
      id: 'booking-1',
      customerId: 'customer-1',
      driverProfile: { userId: 'driver-user-1' },
    });
    mockDb.review.findUnique.mockResolvedValue({
      id: 'review-1',
      bookingId: 'booking-1',
      customerId: 'customer-1',
      driverProfileId: 'driver-profile-1',
      rating: 5,
      comment: null,
      status: ReviewStatus.PUBLISHED,
      createdAt: new Date(),
    });
    (getContactInfoForUsers as jest.Mock).mockResolvedValue(new Map());

    const result = await getReviewForBooking('driver-user-1', 'booking-1', mockDb as never);
    expect(result?.id).toBe('review-1');
  });
});

describe('moderateReview', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockDb.$transaction.mockImplementation((cb: (tx: unknown) => unknown) => cb(mockTx));
    (getContactInfoForUsers as jest.Mock).mockResolvedValue(new Map());
  });

  it('rejects an actor without reviews.manage', async () => {
    await expect(
      moderateReview(
        {
          reviewId: 'review-1',
          actor: noPermissionPrincipal,
          targetStatus: ReviewStatus.HIDDEN,
          reason: 'inappropriate',
        },
        mockDb as never,
      ),
    ).rejects.toBeInstanceOf(ForbiddenError);
    expect(mockDb.$transaction).not.toHaveBeenCalled();
  });

  it('allows an admin to hide a PUBLISHED review and decrements the rating aggregate', async () => {
    mockTx.review.findUnique.mockResolvedValue({
      id: 'review-1',
      driverProfileId: 'driver-1',
      rating: 1,
      status: ReviewStatus.PUBLISHED,
    });
    mockDb.review.findUnique.mockResolvedValue({
      id: 'review-1',
      bookingId: 'booking-1',
      customerId: 'customer-1',
      driverProfileId: 'driver-1',
      rating: 1,
      comment: null,
      status: ReviewStatus.HIDDEN,
      createdAt: new Date(),
      driverProfile: { id: 'driver-1', displayName: 'Driver One', firstName: null, lastName: null },
    });

    await moderateReview(
      {
        reviewId: 'review-1',
        actor: adminPrincipal,
        targetStatus: ReviewStatus.HIDDEN,
        reason: 'One-star bombing suspected',
      },
      mockDb as never,
    );

    expect(decrementRatingAggregate).toHaveBeenCalledWith(mockTx, 'driver-1', 1);
    expect(mockTx.review.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'review-1' },
        data: expect.objectContaining({ status: ReviewStatus.HIDDEN }),
      }),
    );
    expect(recordAuditLog).toHaveBeenCalledWith(
      mockTx,
      expect.objectContaining({ action: 'review.moderated' }),
    );
    expect(insertOutboxEvent).toHaveBeenCalledWith(
      mockTx,
      expect.objectContaining({ eventType: 'review.moderated' }),
    );
  });

  it('re-increments the aggregate when a review is restored to PUBLISHED', async () => {
    mockTx.review.findUnique.mockResolvedValue({
      id: 'review-1',
      driverProfileId: 'driver-1',
      rating: 4,
      status: ReviewStatus.HIDDEN,
    });
    mockDb.review.findUnique.mockResolvedValue({
      id: 'review-1',
      bookingId: 'booking-1',
      customerId: 'customer-1',
      driverProfileId: 'driver-1',
      rating: 4,
      comment: null,
      status: ReviewStatus.PUBLISHED,
      createdAt: new Date(),
      driverProfile: { id: 'driver-1', displayName: 'Driver One', firstName: null, lastName: null },
    });

    await moderateReview(
      {
        reviewId: 'review-1',
        actor: adminPrincipal,
        targetStatus: ReviewStatus.PUBLISHED,
        reason: 'Appeal upheld',
      },
      mockDb as never,
    );

    expect(incrementRatingAggregate).toHaveBeenCalledWith(mockTx, 'driver-1', 4);
    expect(decrementRatingAggregate).not.toHaveBeenCalled();
  });

  it('rejects an invalid moderation transition (e.g. REJECTED -> FLAGGED)', async () => {
    mockTx.review.findUnique.mockResolvedValue({
      id: 'review-1',
      driverProfileId: 'driver-1',
      rating: 1,
      status: ReviewStatus.REJECTED,
    });

    await expect(
      moderateReview(
        {
          reviewId: 'review-1',
          actor: adminPrincipal,
          targetStatus: ReviewStatus.FLAGGED,
          reason: 'test',
        },
        mockDb as never,
      ),
    ).rejects.toBeInstanceOf(InvalidReviewModerationTransitionError);
    expect(mockTx.review.update).not.toHaveBeenCalled();
  });
});
