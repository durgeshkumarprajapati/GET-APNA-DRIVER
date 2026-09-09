import 'server-only';
import type { UserRole } from '@prisma/client';
import { prisma, type Db } from '@/shared/database/prisma';
import { recordAuditLog } from '@/shared/audit/audit-service';
import { insertOutboxEvent } from '@/shared/outbox/outbox-service';
import * as userRepository from '../../infrastructure/user-repository';
import * as rbacRepository from '../../infrastructure/rbac-repository';
import { requirePermission } from '../../authorization/authorization-service';
import { PERMISSIONS } from '../../domain/permission-catalog';
import { SYSTEM_ROLE_CODES } from '../../domain/role-catalog';
import {
  LastAdministratorError,
  RoleNotAssignedError,
  RoleNotFoundError,
  SelfRoleEscalationError,
  UserNotFoundError,
} from '../../domain/errors';
import type { AuthenticatedPrincipal } from '../../domain/types';

export interface AssignRoleInput {
  userId: string;
  roleCode: string;
  actor: AuthenticatedPrincipal;
}

/**
 * Assigns a role to a user. Requires `identity.users.roles.manage` — there is
 * no self-service path. An actor can never grant themselves ADMINISTRATOR,
 * even if they already hold `identity.users.roles.manage`; new admins must
 * come from the seed data or from another administrator acting on a
 * different account.
 */
export async function assignRole(input: AssignRoleInput): Promise<UserRole> {
  const { userId, roleCode, actor } = input;

  requirePermission(actor, PERMISSIONS.IDENTITY_USERS_ROLES_MANAGE);

  if (userId === actor.userId && roleCode === SYSTEM_ROLE_CODES.ADMINISTRATOR) {
    throw new SelfRoleEscalationError();
  }

  return prisma.$transaction(async (tx: Db) => {
    const user = await userRepository.findUserById(tx, userId);
    if (!user) {
      throw new UserNotFoundError(userId);
    }

    const role = await rbacRepository.findRoleByCode(tx, roleCode);
    if (!role) {
      throw new RoleNotFoundError(roleCode);
    }

    const existing = await rbacRepository.findUserRoleAssignment(tx, userId, role.id);
    const alreadyActive = existing !== null && existing.revokedAt === null;

    const assignment = await rbacRepository.upsertRoleAssignment(tx, {
      userId,
      roleId: role.id,
      assignedBy: actor.userId,
    });

    if (!alreadyActive) {
      await recordAuditLog(tx, {
        actorUserId: actor.userId,
        action: 'identity.user.role_assigned',
        entityType: 'User',
        entityId: userId,
        beforeState: existing ? { roleCode, active: false } : null,
        afterState: { roleCode, active: true },
        requestMetadata: null,
      });

      await insertOutboxEvent(tx, {
        eventType: 'user.role_assigned',
        aggregateType: 'User',
        aggregateId: userId,
        payload: { userId, roleCode, assignedBy: actor.userId },
      });
    }

    return assignment;
  });
}

export interface RevokeRoleInput {
  userId: string;
  roleCode: string;
  actor: AuthenticatedPrincipal;
}

/** Revokes a currently-active role from a user. Requires `identity.users.roles.manage`. */
export async function revokeRole(input: RevokeRoleInput): Promise<UserRole> {
  const { userId, roleCode, actor } = input;

  requirePermission(actor, PERMISSIONS.IDENTITY_USERS_ROLES_MANAGE);

  return prisma.$transaction(async (tx: Db) => {
    const role = await rbacRepository.findRoleByCode(tx, roleCode);
    if (!role) {
      throw new RoleNotFoundError(roleCode);
    }

    const existing = await rbacRepository.findUserRoleAssignment(tx, userId, role.id);
    if (!existing || existing.revokedAt !== null) {
      throw new RoleNotAssignedError(roleCode);
    }

    if (roleCode === SYSTEM_ROLE_CODES.ADMINISTRATOR) {
      const activeAdminCount = await rbacRepository.countActiveRoleAssignments(tx, role.id);
      if (activeAdminCount <= 1) {
        throw new LastAdministratorError();
      }
    }

    const revoked = await rbacRepository.revokeRoleAssignment(tx, {
      userId,
      roleId: role.id,
      revokedBy: actor.userId,
    });

    await recordAuditLog(tx, {
      actorUserId: actor.userId,
      action: 'identity.user.role_revoked',
      entityType: 'User',
      entityId: userId,
      beforeState: { roleCode, active: true },
      afterState: { roleCode, active: false },
      requestMetadata: null,
    });

    await insertOutboxEvent(tx, {
      eventType: 'user.role_revoked',
      aggregateType: 'User',
      aggregateId: userId,
      payload: { userId, roleCode, revokedBy: actor.userId },
    });

    return revoked;
  });
}
