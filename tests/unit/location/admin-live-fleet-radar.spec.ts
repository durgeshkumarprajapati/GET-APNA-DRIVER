import { redis } from '@/shared/redis/client';
import { listOnlineDriversForAdmin } from '@/modules/location/application/nearby-driver-service';

jest.mock('@/shared/redis/client', () => ({
  redis: { zrange: jest.fn(), mget: jest.fn() },
}));

jest.mock('@/shared/config/configuration-service', () => ({
  getInteger: jest.fn(),
}));

const mockedZrange = redis.zrange as jest.Mock;
const mockedMget = redis.mget as jest.Mock;

function buildMockDb(profiles: unknown[]) {
  return { driverProfile: { findMany: jest.fn().mockResolvedValue(profiles) } } as never;
}

describe('listOnlineDriversForAdmin', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns an empty list when no drivers are online', async () => {
    mockedZrange.mockResolvedValue([]);
    const result = await listOnlineDriversForAdmin(buildMockDb([]));
    expect(result).toEqual([]);
    expect(mockedMget).not.toHaveBeenCalled();
  });

  it('fails open to an empty list when Redis is unavailable, rather than throwing', async () => {
    mockedZrange.mockRejectedValue(new Error('ECONNREFUSED'));
    const result = await listOnlineDriversForAdmin(buildMockDb([]));
    expect(result).toEqual([]);
  });

  it('joins the live geo index with driver profile data and computes staleness', async () => {
    mockedZrange.mockResolvedValue(['dp-1', 'dp-2']);
    const capturedAt = new Date(Date.now() - 30_000).toISOString();
    mockedMget.mockResolvedValue([
      JSON.stringify({ latitude: 28.6, longitude: 77.2, capturedAt }),
      null, // dp-2 has no cached location — should be dropped, not crash
    ]);
    const db = buildMockDb([
      {
        id: 'dp-1',
        displayName: 'Rajesh Kumar',
        firstName: null,
        lastName: null,
        availabilityStatus: 'AVAILABLE',
      },
    ]);

    const result = await listOnlineDriversForAdmin(db);

    expect(result).toHaveLength(1);
    expect(result[0].driverProfileId).toBe('dp-1');
    expect(result[0].displayName).toBe('Rajesh Kumar');
    expect(result[0].availabilityStatus).toBe('AVAILABLE');
    expect(result[0].staleSeconds).toBeGreaterThanOrEqual(29);
  });

  it('skips a malformed cache entry instead of failing the whole list', async () => {
    mockedZrange.mockResolvedValue(['dp-1']);
    mockedMget.mockResolvedValue(['not-json']);
    const db = buildMockDb([]);

    const result = await listOnlineDriversForAdmin(db);
    expect(result).toEqual([]);
  });
});
