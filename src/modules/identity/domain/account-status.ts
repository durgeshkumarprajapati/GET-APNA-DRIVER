import type { AccountStatus } from './types';

/**
 * Allowed account status transitions. This is the single source of truth for
 * what state changes are legal — nothing updates `User.accountStatus`
 * without going through `isValidAccountStatusTransition`
 * (application/services/account-status-service.ts).
 *
 * PENDING     -> ACTIVE | DEACTIVATED | DELETED
 * ACTIVE      -> SUSPENDED | DEACTIVATED | DELETED
 * SUSPENDED   -> ACTIVE | DEACTIVATED | DELETED
 * DEACTIVATED -> ACTIVE | DELETED
 * DELETED     -> (terminal; no transitions out)
 */
const ACCOUNT_STATUS_TRANSITIONS: Record<AccountStatus, readonly AccountStatus[]> = {
  PENDING: ['ACTIVE', 'DEACTIVATED', 'DELETED'],
  ACTIVE: ['SUSPENDED', 'DEACTIVATED', 'DELETED'],
  SUSPENDED: ['ACTIVE', 'DEACTIVATED', 'DELETED'],
  DEACTIVATED: ['ACTIVE', 'DELETED'],
  DELETED: [],
};

export function isValidAccountStatusTransition(from: AccountStatus, to: AccountStatus): boolean {
  if (from === to) {
    return false;
  }
  return ACCOUNT_STATUS_TRANSITIONS[from].includes(to);
}

export function getAllowedAccountStatusTransitions(from: AccountStatus): readonly AccountStatus[] {
  return ACCOUNT_STATUS_TRANSITIONS[from];
}
