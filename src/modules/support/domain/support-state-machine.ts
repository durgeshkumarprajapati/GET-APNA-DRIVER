import { SupportTicketStatus } from '@prisma/client';
import { InvalidSupportTicketStateTransitionError } from './errors';

/**
 * Valid state transitions for Support Ticket Lifecycle:
 * OPEN -> IN_PROGRESS, WAITING_FOR_CUSTOMER, RESOLVED, CLOSED
 * IN_PROGRESS -> WAITING_FOR_CUSTOMER, RESOLVED, CLOSED
 * WAITING_FOR_CUSTOMER -> IN_PROGRESS, RESOLVED, CLOSED, REOPENED
 * RESOLVED -> CLOSED, REOPENED
 * CLOSED -> REOPENED
 * REOPENED -> IN_PROGRESS, WAITING_FOR_CUSTOMER, RESOLVED, CLOSED
 */
const ALLOWED_TRANSITIONS: Record<SupportTicketStatus, readonly SupportTicketStatus[]> = {
  [SupportTicketStatus.OPEN]: [
    SupportTicketStatus.IN_PROGRESS,
    SupportTicketStatus.WAITING_FOR_CUSTOMER,
    SupportTicketStatus.RESOLVED,
    SupportTicketStatus.CLOSED,
  ],
  [SupportTicketStatus.IN_PROGRESS]: [
    SupportTicketStatus.WAITING_FOR_CUSTOMER,
    SupportTicketStatus.RESOLVED,
    SupportTicketStatus.CLOSED,
  ],
  [SupportTicketStatus.WAITING_FOR_CUSTOMER]: [
    SupportTicketStatus.IN_PROGRESS,
    SupportTicketStatus.RESOLVED,
    SupportTicketStatus.CLOSED,
    SupportTicketStatus.REOPENED,
  ],
  [SupportTicketStatus.RESOLVED]: [SupportTicketStatus.CLOSED, SupportTicketStatus.REOPENED],
  [SupportTicketStatus.CLOSED]: [SupportTicketStatus.REOPENED],
  [SupportTicketStatus.REOPENED]: [
    SupportTicketStatus.IN_PROGRESS,
    SupportTicketStatus.WAITING_FOR_CUSTOMER,
    SupportTicketStatus.RESOLVED,
    SupportTicketStatus.CLOSED,
  ],
};

export function validateTicketStateTransition(
  currentStatus: SupportTicketStatus,
  targetStatus: SupportTicketStatus,
): void {
  if (currentStatus === targetStatus) {
    return; // No-op transition
  }
  const allowed = ALLOWED_TRANSITIONS[currentStatus];
  if (!allowed || !allowed.includes(targetStatus)) {
    throw new InvalidSupportTicketStateTransitionError(currentStatus, targetStatus);
  }
}

export function isTerminalState(status: SupportTicketStatus): boolean {
  return status === SupportTicketStatus.CLOSED;
}
