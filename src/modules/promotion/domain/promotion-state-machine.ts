import { InvalidPromotionStatusTransitionError } from './errors';
import type { PromotionStatus } from './types';

/**
 * DRAFT -> ACTIVE (publish) -> PAUSED <-> ACTIVE (pause/resume) -> ARCHIVED,
 * or ACTIVE/PAUSED -> ARCHIVED directly. DRAFT can also be archived
 * (abandoned before ever going live). ARCHIVED is terminal — an admin
 * creates a new promotion rather than reviving an archived one, the same
 * "terminal state, create anew" convention as SettlementStatus.FAILED
 * (see settlement-state-machine.ts).
 *
 * EXPIRED is deliberately not a member of this state machine at all — see
 * the schema.prisma doc comment on the PromotionStatus enum. Expiry is
 * derived from `endsAt` at read time (isPromotionExpired below), never a
 * stored transition.
 *
 * DRAFT   -> ACTIVE | ARCHIVED
 * ACTIVE  -> PAUSED | ARCHIVED
 * PAUSED  -> ACTIVE | ARCHIVED
 * ARCHIVED -> (terminal)
 */
const VALID_TRANSITIONS: Record<PromotionStatus, readonly PromotionStatus[]> = {
  DRAFT: ['ACTIVE', 'ARCHIVED'],
  ACTIVE: ['PAUSED', 'ARCHIVED'],
  PAUSED: ['ACTIVE', 'ARCHIVED'],
  ARCHIVED: [],
};

export function isTerminalPromotionStatus(status: PromotionStatus): boolean {
  return VALID_TRANSITIONS[status].length === 0;
}

export function validatePromotionStatusTransition(
  currentStatus: PromotionStatus,
  targetStatus: PromotionStatus,
): void {
  const allowed = VALID_TRANSITIONS[currentStatus] ?? [];
  if (!allowed.includes(targetStatus)) {
    throw new InvalidPromotionStatusTransitionError(currentStatus, targetStatus);
  }
}

/** A promotion is only usable while ACTIVE, within its date window, and not derived-expired. */
export function isPromotionCurrentlyUsable(
  status: PromotionStatus,
  startsAt: Date,
  endsAt: Date | null,
  now: Date = new Date(),
): boolean {
  if (status !== 'ACTIVE') {
    return false;
  }
  if (now < startsAt) {
    return false;
  }
  if (endsAt && now > endsAt) {
    return false;
  }
  return true;
}

/** Only a promotion that has never been used, and never went live, may still have its financial terms edited. */
export function isPromotionEditable(status: PromotionStatus): boolean {
  return status === 'DRAFT';
}
