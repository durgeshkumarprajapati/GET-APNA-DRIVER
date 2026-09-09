import { InvalidSettlementStatusTransitionError } from './errors';
import type { SettlementStatus } from './types';

/**
 * DriverSettlement transitions. PAID is reachable only from PROCESSING —
 * there is no PENDING -> PAID shortcut, so "mark paid" is never a single
 * uncontrolled step. A FAILED or CANCELLED settlement is terminal; if the
 * driver still needs paying out, an admin creates a new settlement (the
 * released funds are available again for it) rather than resurrecting this
 * one.
 *
 * PENDING    -> PROCESSING | CANCELLED
 * PROCESSING -> PAID | FAILED
 * PAID, FAILED, CANCELLED -> (terminal)
 */
const VALID_TRANSITIONS: Record<SettlementStatus, readonly SettlementStatus[]> = {
  PENDING: ['PROCESSING', 'CANCELLED'],
  PROCESSING: ['PAID', 'FAILED'],
  PAID: [],
  FAILED: [],
  CANCELLED: [],
};

export function isTerminalSettlementStatus(status: SettlementStatus): boolean {
  return VALID_TRANSITIONS[status].length === 0;
}

export function validateSettlementStatusTransition(
  currentStatus: SettlementStatus,
  targetStatus: SettlementStatus,
): void {
  const allowed = VALID_TRANSITIONS[currentStatus] ?? [];
  if (!allowed.includes(targetStatus)) {
    throw new InvalidSettlementStatusTransitionError(currentStatus, targetStatus);
  }
}
