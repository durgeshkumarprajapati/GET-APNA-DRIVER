import type { runStalledSearchSweep as RunStalledSearchSweepType } from '@/worker/jobs/stalled-search-sweep-job';
import type { Db } from '@/shared/database/prisma';

const mockFindAndOfferNextDriver = jest.fn();
const mockAcquireLock = jest.fn().mockResolvedValue(true);
const mockReleaseLock = jest.fn().mockResolvedValue(true);
const mockGetInteger = jest.fn().mockResolvedValue(0);

jest.mock('@/modules/booking/application/matching-service', () => ({
  findAndOfferNextDriver: mockFindAndOfferNextDriver,
}));

jest.mock('@/shared/config/configuration-service', () => ({
  getInteger: mockGetInteger,
}));

jest.mock('@/shared/infrastructure/redis-lock-service', () => ({
  RedisLockService: {
    acquireLock: mockAcquireLock,
    releaseLock: mockReleaseLock,
  },
}));

jest.mock('@/shared/database/prisma', () => ({ prisma: {} }));
jest.mock('@/shared/logging/logger', () => ({
  logger: { error: jest.fn(), warn: jest.fn(), info: jest.fn() },
}));

function buildMockDb(bookings: Array<{ id: string }>) {
  return {
    booking: {
      findMany: jest.fn().mockResolvedValue(bookings),
    },
  } as unknown as Db;
}

describe('runStalledSearchSweep', () => {
  let runStalledSearchSweep: typeof RunStalledSearchSweepType;

  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
    mockAcquireLock.mockResolvedValue(true);
    mockReleaseLock.mockResolvedValue(true);
    mockGetInteger.mockResolvedValue(0); // bypasses the self-gate in every test
    mockFindAndOfferNextDriver.mockResolvedValue({ status: 'OFFERED' });
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    ({ runStalledSearchSweep } = require('@/worker/jobs/stalled-search-sweep-job'));
  });

  it('does nothing when no booking is stuck searching with zero active offers', async () => {
    const db = buildMockDb([]);

    const result = await runStalledSearchSweep(db);

    expect(result.sweptCount).toBe(0);
    expect(result.skipped).toBe(false);
    expect(mockFindAndOfferNextDriver).not.toHaveBeenCalled();
  });

  // Regression: findAndOfferNextDriver returns NO_DRIVERS_FOUND without
  // creating a BookingAssignmentAttempt whenever the current radius has
  // zero eligible candidates but the search hasn't hit its deadline/max
  // radius yet — and nothing else in the system ever calls it again for
  // that booking. This sweep is what's supposed to catch exactly that.
  it('re-triggers matching for every SEARCHING_DRIVER booking with no PENDING offer', async () => {
    const db = buildMockDb([{ id: 'bk-stalled-1' }, { id: 'bk-stalled-2' }]);

    const result = await runStalledSearchSweep(db);

    expect(result.sweptCount).toBe(2);
    expect(mockFindAndOfferNextDriver).toHaveBeenCalledWith('bk-stalled-1', db);
    expect(mockFindAndOfferNextDriver).toHaveBeenCalledWith('bk-stalled-2', db);
    expect(db.booking.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          status: 'SEARCHING_DRIVER',
          assignmentAttempts: { none: { status: 'PENDING' } },
        }),
      }),
    );
  });

  it('continues sweeping remaining bookings even if one fails', async () => {
    const db = buildMockDb([{ id: 'bk-1' }, { id: 'bk-2' }]);
    mockFindAndOfferNextDriver
      .mockRejectedValueOnce(new Error('db hiccup'))
      .mockResolvedValueOnce({ status: 'OFFERED' });

    const result = await runStalledSearchSweep(db);

    expect(result.sweptCount).toBe(1);
    expect(mockFindAndOfferNextDriver).toHaveBeenCalledTimes(2);
  });

  it('skips the sweep entirely when the lock is already held by another worker', async () => {
    mockAcquireLock.mockResolvedValue(false);
    const db = buildMockDb([{ id: 'bk-1' }]);

    const result = await runStalledSearchSweep(db);

    expect(result.skipped).toBe(true);
    expect(result.sweptCount).toBe(0);
    expect(mockFindAndOfferNextDriver).not.toHaveBeenCalled();
  });

  it('respects the configured interval and skips when called again too soon', async () => {
    mockGetInteger.mockResolvedValue(3600); // 1 hour — definitely not elapsed
    const db = buildMockDb([{ id: 'bk-1' }]);

    const first = await runStalledSearchSweep(db);
    expect(first.skipped).toBe(false);

    const second = await runStalledSearchSweep(db);
    expect(second.skipped).toBe(true);
    expect(mockFindAndOfferNextDriver).toHaveBeenCalledTimes(1);
  });
});
