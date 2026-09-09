import { getDriverPerformanceMetrics } from '@/modules/review/application/driver-performance-service';

jest.mock('@/shared/database/prisma', () => ({ prisma: {} }));
jest.mock('@/modules/review/application/rating-aggregate-service', () => ({
  getDriverRatingSummary: jest.fn().mockResolvedValue({
    driverProfileId: 'driver-1',
    totalReviews: 0,
    averageRating: 0,
    distribution: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 },
  }),
}));

function buildDb(overrides: {
  completedTrips?: number;
  cancelledAssignedTrips?: number;
  eligibleAssignedTrips?: number;
  wallet?: { totalEarned: unknown } | null;
  avgAmount?: unknown;
}) {
  const bookingCount = jest
    .fn()
    .mockResolvedValueOnce(overrides.completedTrips ?? 0)
    .mockResolvedValueOnce(overrides.cancelledAssignedTrips ?? 0)
    .mockResolvedValueOnce(overrides.eligibleAssignedTrips ?? 0);

  return {
    booking: { count: bookingCount },
    driverWallet: { findUnique: jest.fn().mockResolvedValue(overrides.wallet ?? null) },
    payment: {
      aggregate: jest.fn().mockResolvedValue({ _avg: { amount: overrides.avgAmount ?? null } }),
    },
  } as never;
}

describe('getDriverPerformanceMetrics', () => {
  it('returns all-zero metrics for a driver with no trip history (no division by zero)', async () => {
    const db = buildDb({});

    const metrics = await getDriverPerformanceMetrics('driver-1', db);

    expect(metrics.completedTrips).toBe(0);
    expect(metrics.completionRate).toBe('0');
    expect(metrics.cancellationRate).toBe('0');
    expect(metrics.averageTripValue).toBe('0');
    expect(metrics.totalEarnings).toBe('0');
  });

  it('computes completion and cancellation rate as exact Decimal division', async () => {
    // 3 completed + 1 cancelled out of 4 eligible assigned trips.
    const db = buildDb({
      completedTrips: 3,
      cancelledAssignedTrips: 1,
      eligibleAssignedTrips: 4,
      wallet: { totalEarned: { toString: () => '12500.0000' } },
      avgAmount: { toString: () => '850.5000' },
    });

    const metrics = await getDriverPerformanceMetrics('driver-1', db);

    expect(metrics.completionRate).toBe('0.75');
    expect(metrics.cancellationRate).toBe('0.25');
    expect(metrics.averageTripValue).toBe('850.5000');
    expect(metrics.totalEarnings).toBe('12500.0000');
  });
});
