jest.mock('@/shared/database/prisma', () => ({
  prisma: {},
}));

jest.mock('@/modules/identity/infrastructure/user-repository', () => ({
  findUserById: jest.fn(),
}));

jest.mock('@/modules/identity/infrastructure/rbac-repository', () => ({
  loadUserRbacSnapshot: jest.fn(),
}));

import { buildPrincipal } from '@/modules/identity/application/services/principal-service';
import * as userRepository from '@/modules/identity/infrastructure/user-repository';
import * as rbacRepository from '@/modules/identity/infrastructure/rbac-repository';

const mockedFindUserById = userRepository.findUserById as jest.Mock;
const mockedLoadUserRbacSnapshot = rbacRepository.loadUserRbacSnapshot as jest.Mock;

describe('buildPrincipal', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('returns null when the user does not exist', async () => {
    mockedFindUserById.mockResolvedValue(null);
    expect(await buildPrincipal('missing')).toBeNull();
  });

  it('returns null for a deleted user', async () => {
    mockedFindUserById.mockResolvedValue({ id: 'user-1', accountStatus: 'DELETED' });
    expect(await buildPrincipal('user-1')).toBeNull();
  });

  it('returns a principal with roles and permissions for an active user', async () => {
    mockedFindUserById.mockResolvedValue({ id: 'user-1', accountStatus: 'ACTIVE' });
    mockedLoadUserRbacSnapshot.mockResolvedValue({
      roleCodes: ['CUSTOMER'],
      permissionCodes: ['users.profile.read'],
    });

    expect(await buildPrincipal('user-1')).toEqual({
      userId: 'user-1',
      accountStatus: 'ACTIVE',
      roles: ['CUSTOMER'],
      permissions: ['users.profile.read'],
    });
  });

  it('still resolves a principal for a suspended user (rejection happens in the authorization layer)', async () => {
    mockedFindUserById.mockResolvedValue({ id: 'user-1', accountStatus: 'SUSPENDED' });
    mockedLoadUserRbacSnapshot.mockResolvedValue({ roleCodes: [], permissionCodes: [] });

    const principal = await buildPrincipal('user-1');
    expect(principal?.accountStatus).toBe('SUSPENDED');
  });
});
