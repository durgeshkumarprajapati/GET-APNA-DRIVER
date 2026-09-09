import 'server-only';
import type { Role, UserRole } from '@prisma/client';
import type { Db } from '@/shared/database/prisma';

export interface UserRbacSnapshot {
  roleCodes: string[];
  permissionCodes: string[];
}

export async function findRoleByCode(db: Db, code: string): Promise<Role | null> {
  return db.role.findUnique({ where: { code } });
}

export async function findUserRoleAssignment(
  db: Db,
  userId: string,
  roleId: string,
): Promise<UserRole | null> {
  return db.userRole.findUnique({ where: { userId_roleId: { userId, roleId } } });
}

export async function upsertRoleAssignment(
  db: Db,
  params: { userId: string; roleId: string; assignedBy: string | null },
): Promise<UserRole> {
  return db.userRole.upsert({
    where: { userId_roleId: { userId: params.userId, roleId: params.roleId } },
    create: { userId: params.userId, roleId: params.roleId, assignedBy: params.assignedBy },
    update: {
      assignedBy: params.assignedBy,
      assignedAt: new Date(),
      revokedAt: null,
      revokedBy: null,
    },
  });
}

export async function revokeRoleAssignment(
  db: Db,
  params: { userId: string; roleId: string; revokedBy: string },
): Promise<UserRole> {
  return db.userRole.update({
    where: { userId_roleId: { userId: params.userId, roleId: params.roleId } },
    data: { revokedAt: new Date(), revokedBy: params.revokedBy },
  });
}

/** Loads the flattened set of active role codes and granted permission codes for a user. */
export async function loadUserRbacSnapshot(db: Db, userId: string): Promise<UserRbacSnapshot> {
  const assignments = await db.userRole.findMany({
    where: { userId, revokedAt: null },
    include: {
      role: {
        include: {
          rolePermissions: { include: { permission: true } },
        },
      },
    },
  });

  const roleCodes = new Set<string>();
  const permissionCodes = new Set<string>();

  for (const assignment of assignments) {
    roleCodes.add(assignment.role.code);
    for (const rolePermission of assignment.role.rolePermissions) {
      permissionCodes.add(rolePermission.permission.code);
    }
  }

  return { roleCodes: [...roleCodes], permissionCodes: [...permissionCodes] };
}
