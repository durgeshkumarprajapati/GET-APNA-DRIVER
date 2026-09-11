import { CallStatus } from '@prisma/client';
import { InvalidCallStateTransitionError } from './errors';

/**
 * Valid state transitions for Call Session Lifecycle:
 * REQUESTED -> INITIATED, CANCELLED, FAILED
 * INITIATED -> RINGING, ANSWERED, COMPLETED, FAILED, CANCELLED
 * RINGING   -> ANSWERED, COMPLETED, FAILED, CANCELLED
 * ANSWERED  -> COMPLETED, FAILED
 * COMPLETED / FAILED / CANCELLED -> Terminal states
 */
const ALLOWED_TRANSITIONS: Record<CallStatus, readonly CallStatus[]> = {
  [CallStatus.REQUESTED]: [
    CallStatus.INITIATED,
    CallStatus.CANCELLED,
    CallStatus.FAILED,
  ],
  [CallStatus.INITIATED]: [
    CallStatus.RINGING,
    CallStatus.ANSWERED,
    CallStatus.COMPLETED,
    CallStatus.FAILED,
    CallStatus.CANCELLED,
  ],
  [CallStatus.RINGING]: [
    CallStatus.ANSWERED,
    CallStatus.COMPLETED,
    CallStatus.FAILED,
    CallStatus.CANCELLED,
  ],
  [CallStatus.ANSWERED]: [
    CallStatus.COMPLETED,
    CallStatus.FAILED,
  ],
  [CallStatus.COMPLETED]: [],
  [CallStatus.FAILED]: [],
  [CallStatus.CANCELLED]: [],
};

export function validateCallStateTransition(
  currentStatus: CallStatus,
  targetStatus: CallStatus,
): void {
  if (currentStatus === targetStatus) {
    return; // Idempotent update
  }
  const allowed = ALLOWED_TRANSITIONS[currentStatus];
  if (!allowed || !allowed.includes(targetStatus)) {
    throw new InvalidCallStateTransitionError(currentStatus, targetStatus);
  }
}

export function isCallTerminalState(status: CallStatus): boolean {
  return (
    status === CallStatus.COMPLETED ||
    status === CallStatus.FAILED ||
    status === CallStatus.CANCELLED
  );
}
