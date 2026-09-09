import { InvalidPaymentStatusTransitionError } from './errors';
import type { PaymentStatus } from './types';

/**
 * PaymentStatus transitions, independent of BookingStatus (a booking
 * completing does not imply payment success, and payment success does not
 * imply trip completion — see payment-service.ts for the explicit
 * integration points between the two).
 *
 * CREATED    -> PROCESSING | FAILED | CANCELLED
 * PROCESSING -> CAPTURED | FAILED
 * CAPTURED   -> PARTIALLY_REFUNDED | REFUNDED
 * PARTIALLY_REFUNDED -> PARTIALLY_REFUNDED | REFUNDED   (further partial refunds)
 * FAILED, CANCELLED, REFUNDED -> (terminal)
 */
const VALID_TRANSITIONS: Record<PaymentStatus, readonly PaymentStatus[]> = {
  CREATED: ['PROCESSING', 'FAILED', 'CANCELLED'],
  PROCESSING: ['CAPTURED', 'FAILED'],
  CAPTURED: ['PARTIALLY_REFUNDED', 'REFUNDED'],
  PARTIALLY_REFUNDED: ['PARTIALLY_REFUNDED', 'REFUNDED'],
  FAILED: [],
  CANCELLED: [],
  REFUNDED: [],
};

const TERMINAL_STATUSES: readonly PaymentStatus[] = ['FAILED', 'CANCELLED', 'REFUNDED'];

export function isTerminalPaymentStatus(status: PaymentStatus): boolean {
  return TERMINAL_STATUSES.includes(status);
}

export function validatePaymentStatusTransition(
  currentStatus: PaymentStatus,
  targetStatus: PaymentStatus,
): void {
  if (currentStatus === targetStatus && currentStatus === 'PARTIALLY_REFUNDED') {
    return; // Two successive partial refunds are both valid no-op-shaped transitions.
  }

  const allowed = VALID_TRANSITIONS[currentStatus] ?? [];
  if (!allowed.includes(targetStatus)) {
    throw new InvalidPaymentStatusTransitionError(currentStatus, targetStatus);
  }
}
