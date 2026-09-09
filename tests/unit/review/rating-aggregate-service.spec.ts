import {
  decrementRatingAggregate,
  getDriverRatingSummary,
  incrementRatingAggregate,
} from '@/modules/review/application/rating-aggregate-service';

jest.mock('@/shared/database/prisma', () => ({ prisma: {} }));

describe('incrementRatingAggregate', () => {
  it('issues a single atomic upsert statement (no read-then-write)', async () => {
    const executeRaw = jest.fn().mockResolvedValue(1);
    const mockDb = { $executeRaw: executeRaw } as never;

    await incrementRatingAggregate(mockDb, 'driver-1', 5);

    expect(executeRaw).toHaveBeenCalledTimes(1);
  });
});

describe('decrementRatingAggregate', () => {
  it('issues a single atomic update statement', async () => {
    const executeRaw = jest.fn().mockResolvedValue(1);
    const mockDb = { $executeRaw: executeRaw } as never;

    await decrementRatingAggregate(mockDb, 'driver-1', 2);

    expect(executeRaw).toHaveBeenCalledTimes(1);
  });
});

describe('getDriverRatingSummary', () => {
  it('returns a zeroed summary for a driver with no reviews yet', async () => {
    const mockDb = {
      driverRatingSummary: { findUnique: jest.fn().mockResolvedValue(null) },
    } as never;

    const summary = await getDriverRatingSummary('driver-1', mockDb);

    expect(summary).toEqual({
      driverProfileId: 'driver-1',
      totalReviews: 0,
      averageRating: 0,
      distribution: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 },
    });
  });

  it('maps a real summary row into the distribution shape', async () => {
    const mockDb = {
      driverRatingSummary: {
        findUnique: jest.fn().mockResolvedValue({
          totalReviews: 3,
          averageRating: { toString: () => '4.67' },
          fiveStarCount: 2,
          fourStarCount: 1,
          threeStarCount: 0,
          twoStarCount: 0,
          oneStarCount: 0,
        }),
      },
    } as never;

    const summary = await getDriverRatingSummary('driver-1', mockDb);

    expect(summary.totalReviews).toBe(3);
    expect(summary.averageRating).toBeCloseTo(4.67);
    expect(summary.distribution).toEqual({ 5: 2, 4: 1, 3: 0, 2: 0, 1: 0 });
  });
});
