import { loadUserRbacSnapshot } from '@/modules/identity/infrastructure/rbac-repository';
import { redis } from '@/shared/redis/client';

jest.mock('@/shared/redis/client', () => ({
  redis: { get: jest.fn(), set: jest.fn(), del: jest.fn() },
}));

const mockedGet = redis.get as jest.Mock;
const mockedSet = redis.set as jest.Mock;

function buildMockDb(assignments: unknown[]) {
  return { userRole: { findMany: jest.fn().mockResolvedValue(assignments) } } as never;
}

describe('loadUserRbacSnapshot read-through cache', () => {
  beforeEach(() => jest.clearAllMocks());

  it('cache hit: never queries the database', async () => {
    const cached = { roleCodes: ['ADMINISTRATOR'], permissionCodes: ['audit.log.read'] };
    mockedGet.mockResolvedValue(JSON.stringify(cached));
    const db = buildMockDb([]);

    const result = await loadUserRbacSnapshot(db, 'user-1');

    expect(result).toEqual(cached);
    expect((db as { userRole: { findMany: jest.Mock } }).userRole.findMany).not.toHaveBeenCalled();
  });

  it('cache miss: queries the database, then populates the cache', async () => {
    mockedGet.mockResolvedValue(null);
    const db = buildMockDb([
      {
        role: {
          code: 'CUSTOMER',
          rolePermissions: [{ permission: { code: 'bookings.read' } }],
        },
      },
    ]);

    const result = await loadUserRbacSnapshot(db, 'user-2');

    expect(result).toEqual({ roleCodes: ['CUSTOMER'], permissionCodes: ['bookings.read'] });
    expect((db as { userRole: { findMany: jest.Mock } }).userRole.findMany).toHaveBeenCalledTimes(
      1,
    );
    expect(mockedSet).toHaveBeenCalledWith(
      'rbac:snapshot:user-2',
      JSON.stringify(result),
      'EX',
      60,
    );
  });
});
