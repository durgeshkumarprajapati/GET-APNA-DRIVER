import 'server-only';
import type { User } from '@prisma/client';
import { prisma, type Db } from '@/shared/database/prisma';
import { recordAuditLog } from '@/shared/audit/audit-service';
import { insertOutboxEvent } from '@/shared/outbox/outbox-service';
import * as userRepository from '../../infrastructure/user-repository';
import { isValidAccountStatusTransition } from '../../domain/account-status';
import { InvalidAccountStatusTransitionError, UserNotFoundError } from '../../domain/errors';
import { requirePermission } from '../../authorization/authorization-service';
import { PERMISSIONS } from '../../domain/permission-catalog';
import type { AccountStatus, AuthenticatedPrincipal } from '../../domain/types';

export interface TransitionAccountStatusInput {
  userId: string;
  targetStatus: AccountStatus;
  /** Null for system-initiated transitions (no human/service actor). */
  actor: AuthenticatedPrincipal | null;
  reason?: string;
}

const EVENT_BY_STATUS: Partial<Record<AccountStatus, string>> = {
  ACTIVE: 'user.account_activated',
  SUSPENDED: 'user.account_suspended',
  DEACTIVATED: 'user.account_deactivated',
  DELETED: 'user.account_deleted',
};

/**
 * The only supported way to change `User.accountStatus`. Validates the
 * transition against the account-status state machine and, unless the actor
 * is deactivating their own account, requires
 * `identity.users.status.manage`. Updates the user, writes an audit log
 * entry, and inserts an outbox event in one transaction.
 */
export async function transitionAccountStatus(input: TransitionAccountStatusInput): Promise<User> {
  const { userId, targetStatus, actor, reason } = input;

  const isSelfDeactivation =
    actor !== null && actor.userId === userId && targetStatus === 'DEACTIVATED';
  if (!isSelfDeactivation && actor !== null) {
    requirePermission(actor, PERMISSIONS.IDENTITY_USERS_STATUS_MANAGE);
  }

  return prisma.$transaction(async (tx: Db) => {
    const user = await userRepository.findUserById(tx, userId);
    if (!user) {
      throw new UserNotFoundError(userId);
    }

    if (!isValidAccountStatusTransition(user.accountStatus, targetStatus)) {
      throw new InvalidAccountStatusTransitionError(user.accountStatus, targetStatus);
    }

    const updated = await userRepository.updateAccountStatus(tx, userId, {
      accountStatus: targetStatus,
      deletedAt: targetStatus === 'DELETED' ? new Date() : undefined,
      deletedBy: targetStatus === 'DELETED' ? (actor?.userId ?? null) : undefined,
    });

    await recordAuditLog(tx, {
      actorUserId: actor?.userId ?? null,
      action: 'identity.user.account_status_changed',
      entityType: 'User',
      entityId: userId,
      beforeState: { accountStatus: user.accountStatus },
      afterState: { accountStatus: updated.accountStatus, reason: reason ?? null },
      requestMetadata: null,
    });

    const eventType = EVENT_BY_STATUS[targetStatus];
    if (eventType) {
      await insertOutboxEvent(tx, {
        eventType,
        aggregateType: 'User',
        aggregateId: userId,
        payload: { userId, previousStatus: user.accountStatus, newStatus: updated.accountStatus },
      });
    }

    return updated;
  });
}
