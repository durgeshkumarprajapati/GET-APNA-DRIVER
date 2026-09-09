import 'server-only';
import { prisma, type Db } from '@/shared/database/prisma';
import * as rbacRepository from '../../infrastructure/rbac-repository';
import { getContactInfoForUsers } from '../../infrastructure/user-repository';

export interface RoleCatalogEntry {
  code: string;
  name: string;
  description: string | null;
  isSystem: boolean;
  permissions: { code: string; description: string | null }[];
}

export interface PermissionCatalogEntry {
  code: string;
  description: string | null;
}

export interface RbacCatalog {
  roles: RoleCatalogEntry[];
  permissions: PermissionCatalogEntry[];
}

/**
 * Read-only role/permission catalog for the RBAC admin screen. Reflects the
 * DB-persisted `RolePermission` mappings (seeded from
 * `rbac-seed-data.ts`) — there is no runtime mutation path for which
 * permissions a role grants; that stays seed-data-only by design (see
 * PERMISSIONS catalog comment: "extend deliberately").
 */
export async function getRbacCatalog(db: Db = prisma): Promise<RbacCatalog> {
  const [roles, permissions] = await Promise.all([
    rbacRepository.listRolesWithPermissions(db),
    rbacRepository.listPermissions(db),
  ]);

  return {
    roles: roles.map((role) => ({
      code: role.code,
      name: role.name,
      description: role.description,
      isSystem: role.isSystem,
      permissions: role.rolePermissions.map((rp) => ({
        code: rp.permission.code,
        description: rp.permission.description,
      })),
    })),
    permissions: permissions.map((permission) => ({
      code: permission.code,
      description: permission.description,
    })),
  };
}

export interface ListUsersWithRolesFilter {
  search?: string;
  roleCode?: string;
  page?: number;
  pageSize?: number;
}

export interface UserWithRolesRow {
  id: string;
  accountStatus: string;
  email: string | null;
  phoneNumber: string | null;
  roles: { code: string; name: string }[];
  createdAt: Date;
}

export interface ListUsersWithRolesResult {
  users: UserWithRolesRow[];
  total: number;
  page: number;
  pageSize: number;
}

const MAX_PAGE_SIZE = 100;
const DEFAULT_PAGE_SIZE = 25;

/**
 * Admin-facing user directory for role assignment. `search` matches against
 * UserIdentity email/phone (User itself carries no contact fields).
 */
export async function listUsersWithRoles(
  filter: ListUsersWithRolesFilter = {},
  db: Db = prisma,
): Promise<ListUsersWithRolesResult> {
  const page = filter.page && filter.page > 0 ? filter.page : 1;
  const pageSize =
    filter.pageSize && filter.pageSize > 0
      ? Math.min(filter.pageSize, MAX_PAGE_SIZE)
      : DEFAULT_PAGE_SIZE;

  const where = {
    ...(filter.search
      ? {
          identities: {
            some: {
              providerName: { in: ['email', 'phone'] },
              OR: [
                { email: { contains: filter.search, mode: 'insensitive' as const } },
                { phoneNumber: { contains: filter.search } },
              ],
            },
          },
        }
      : {}),
    ...(filter.roleCode
      ? { roles: { some: { revokedAt: null, role: { code: filter.roleCode } } } }
      : {}),
  };

  const [users, total] = await Promise.all([
    db.user.findMany({
      where,
      include: {
        roles: { where: { revokedAt: null }, include: { role: true } },
      },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    db.user.count({ where }),
  ]);

  const contactInfo = await getContactInfoForUsers(
    db,
    users.map((user) => user.id),
  );

  return {
    users: users.map((user) => ({
      id: user.id,
      accountStatus: user.accountStatus,
      ...(contactInfo.get(user.id) ?? { email: null, phoneNumber: null }),
      roles: user.roles.map((assignment) => ({
        code: assignment.role.code,
        name: assignment.role.name,
      })),
      createdAt: user.createdAt,
    })),
    total,
    page,
    pageSize,
  };
}
