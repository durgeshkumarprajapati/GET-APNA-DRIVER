jest.mock('@/modules/identity/infrastructure/rbac-repository', () => ({
  listRolesWithPermissions: jest.fn(),
  listPermissions: jest.fn(),
}));

jest.mock('@/modules/identity/infrastructure/user-repository', () => ({
  getContactInfoForUsers: jest.fn(),
}));

jest.mock('@/shared/database/prisma', () => ({
  prisma: {
    user: {
      findMany: jest.fn(),
      count: jest.fn(),
    },
  },
}));

import {
  getRbacCatalog,
  listUsersWithRoles,
} from '@/modules/identity/application/services/rbac-admin-service';
import * as rbacRepository from '@/modules/identity/infrastructure/rbac-repository';
import { getContactInfoForUsers } from '@/modules/identity/infrastructure/user-repository';
import { prisma } from '@/shared/database/prisma';

describe('getRbacCatalog', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('maps roles and permissions into a flat, serializable catalog', async () => {
    (rbacRepository.listRolesWithPermissions as jest.Mock).mockResolvedValue([
      {
        code: 'ADMINISTRATOR',
        name: 'Administrator',
        description: 'Manages the platform.',
        isSystem: true,
        rolePermissions: [
          { permission: { code: 'admin.dashboard.read', description: 'View dashboard.' } },
        ],
      },
    ]);
    (rbacRepository.listPermissions as jest.Mock).mockResolvedValue([
      { code: 'admin.dashboard.read', description: 'View dashboard.' },
    ]);

    const catalog = await getRbacCatalog(undefined as never);

    expect(catalog.roles).toEqual([
      {
        code: 'ADMINISTRATOR',
        name: 'Administrator',
        description: 'Manages the platform.',
        isSystem: true,
        permissions: [{ code: 'admin.dashboard.read', description: 'View dashboard.' }],
      },
    ]);
    expect(catalog.permissions).toEqual([
      { code: 'admin.dashboard.read', description: 'View dashboard.' },
    ]);
  });
});

describe('listUsersWithRoles', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('paginates, filters by role, and enriches with contact info', async () => {
    (prisma.user.findMany as jest.Mock).mockResolvedValue([
      {
        id: 'user-1',
        accountStatus: 'ACTIVE',
        createdAt: new Date('2026-01-01'),
        roles: [{ role: { code: 'DRIVER', name: 'Driver' } }],
      },
    ]);
    (prisma.user.count as jest.Mock).mockResolvedValue(1);
    (getContactInfoForUsers as jest.Mock).mockResolvedValue(
      new Map([['user-1', { email: 'd@example.com', phoneNumber: null }]]),
    );

    const result = await listUsersWithRoles({ roleCode: 'DRIVER', page: 1, pageSize: 10 });

    expect(result.total).toBe(1);
    expect(result.users[0].roles).toEqual([{ code: 'DRIVER', name: 'Driver' }]);
    expect(result.users[0].email).toBe('d@example.com');
    expect(prisma.user.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          roles: { some: { revokedAt: null, role: { code: 'DRIVER' } } },
        }),
      }),
    );
  });

  it('caps pageSize at 100 to avoid unbounded queries', async () => {
    (prisma.user.findMany as jest.Mock).mockResolvedValue([]);
    (prisma.user.count as jest.Mock).mockResolvedValue(0);
    (getContactInfoForUsers as jest.Mock).mockResolvedValue(new Map());

    const result = await listUsersWithRoles({ pageSize: 5000 });

    expect(result.pageSize).toBe(100);
    expect(prisma.user.findMany).toHaveBeenCalledWith(expect.objectContaining({ take: 100 }));
  });
});
