import { getAdminDashboardMetrics } from '@/modules/admin/application/services/dashboard-service';
import { redis } from '@/shared/redis/client';

jest.mock('@/shared/redis/client', () => ({
  redis: { get: jest.fn(), set: jest.fn() },
}));

const mockedGet = redis.get as jest.Mock;
const mockedSet = redis.set as jest.Mock;

function buildMockDb() {
  return {
    booking: { count: jest.fn().mockResolvedValue(1) },
    driverProfile: { count: jest.fn().mockResolvedValue(1) },
    driverDocument: { count: jest.fn().mockResolvedValue(0) },
    payment: {
      aggregate: jest
        .fn()
        .mockResolvedValue({ _sum: { amount: null, commissionAmount: null }, _count: 0 }),
    },
    driverSettlement: {
      aggregate: jest.fn().mockResolvedValue({ _sum: { amount: null }, _count: 0 }),
    },
  } as never;
}

describe('getAdminDashboardMetrics caching', () => {
  beforeEach(() => jest.clearAllMocks());

  it('cache hit: returns the cached value without querying the database', async () => {
    const cached = {
      bookings: { active: 99, completedToday: 1, cancelledToday: 0 },
      drivers: {
        totalApproved: 5,
        onlineNow: 2,
        pendingApplications: 0,
        pendingDocumentVerifications: 0,
      },
      finance: {
        capturedTodayAmount: '0.0000',
        capturedTodayCount: 0,
        commissionTodayAmount: '0.0000',
        pendingSettlementsAmount: '0.0000',
        pendingSettlementsCount: 0,
      },
      generatedAt: new Date().toISOString(),
    };
    mockedGet.mockResolvedValue(JSON.stringify(cached));
    const db = buildMockDb();

    const result = await getAdminDashboardMetrics(db);

    expect(result).toEqual(cached);
    expect((db as { booking: { count: jest.Mock } }).booking.count).not.toHaveBeenCalled();
  });

  it('cache miss: computes fresh metrics and populates the cache with a 20s TTL', async () => {
    mockedGet.mockResolvedValue(null);
    const db = buildMockDb();

    const result = await getAdminDashboardMetrics(db);

    expect(result.bookings.active).toBe(1);
    expect((db as { booking: { count: jest.Mock } }).booking.count).toHaveBeenCalled();
    expect(mockedSet).toHaveBeenCalledWith('admin:dashboard:metrics', expect.any(String), 'EX', 20);
  });

  it('Redis fallback: a cache read/write error still returns freshly computed metrics', async () => {
    mockedGet.mockRejectedValue(new Error('ECONNREFUSED'));
    mockedSet.mockRejectedValue(new Error('ECONNREFUSED'));
    const db = buildMockDb();

    const result = await getAdminDashboardMetrics(db);

    expect(result.bookings.active).toBe(1);
  });
});
