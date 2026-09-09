import {
  getCachedUserRbacSnapshot,
  invalidateUserRbacSnapshot,
  setCachedUserRbacSnapshot,
} from '@/modules/identity/infrastructure/rbac-cache';
import { redis } from '@/shared/redis/client';

jest.mock('@/shared/redis/client', () => ({
  redis: { get: jest.fn(), set: jest.fn(), del: jest.fn() },
}));

const mockedGet = redis.get as jest.Mock;
const mockedSet = redis.set as jest.Mock;
const mockedDel = redis.del as jest.Mock;

describe('RBAC snapshot cache', () => {
  beforeEach(() => jest.clearAllMocks());

  it('cache miss: returns null when nothing is cached', async () => {
    mockedGet.mockResolvedValue(null);
    const result = await getCachedUserRbacSnapshot('user-1');
    expect(result).toBeNull();
  });

  it('cache hit: returns the parsed snapshot', async () => {
    const snapshot = { roleCodes: ['CUSTOMER'], permissionCodes: ['bookings.read'] };
    mockedGet.mockResolvedValue(JSON.stringify(snapshot));

    const result = await getCachedUserRbacSnapshot('user-1');

    expect(result).toEqual(snapshot);
    expect(mockedGet).toHaveBeenCalledWith('rbac:snapshot:user-1');
  });

  it('writes the snapshot with a 60s TTL', async () => {
    const snapshot = { roleCodes: ['DRIVER'], permissionCodes: ['driver.profile.manage'] };
    await setCachedUserRbacSnapshot('user-2', snapshot);

    expect(mockedSet).toHaveBeenCalledWith(
      'rbac:snapshot:user-2',
      JSON.stringify(snapshot),
      'EX',
      60,
    );
  });

  it('invalidation deletes the cache key', async () => {
    await invalidateUserRbacSnapshot('user-3');
    expect(mockedDel).toHaveBeenCalledWith('rbac:snapshot:user-3');
  });

  it('Redis fallback: a read error is treated as a cache miss, not a thrown error', async () => {
    mockedGet.mockRejectedValue(new Error('ECONNREFUSED'));
    const result = await getCachedUserRbacSnapshot('user-4');
    expect(result).toBeNull();
  });

  it('Redis fallback: a write error is swallowed, not thrown', async () => {
    mockedSet.mockRejectedValue(new Error('ECONNREFUSED'));
    await expect(
      setCachedUserRbacSnapshot('user-5', { roleCodes: [], permissionCodes: [] }),
    ).resolves.toBeUndefined();
  });

  it('Redis fallback: an invalidation error is swallowed, not thrown', async () => {
    mockedDel.mockRejectedValue(new Error('ECONNREFUSED'));
    await expect(invalidateUserRbacSnapshot('user-6')).resolves.toBeUndefined();
  });
});
