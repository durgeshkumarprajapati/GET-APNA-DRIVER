import { DisputeStatus } from '@prisma/client';

export class InvalidDisputeStateTransitionError extends Error {
  constructor(
    public currentStatus: DisputeStatus,
    public targetStatus: DisputeStatus,
  ) {
    super(`Cannot transition dispute status from ${currentStatus} to ${targetStatus}`);
    this.name = 'InvalidDisputeStateTransitionError';
  }
}

const ALLOWED_TRANSITIONS: Record<DisputeStatus, readonly DisputeStatus[]> = {
  OPEN: ['UNDER_REVIEW', 'RESOLVED', 'ESCALATED', 'CANCELLED'],
  UNDER_REVIEW: ['RESOLVED', 'ESCALATED', 'CANCELLED'],
  ESCALATED: ['UNDER_REVIEW', 'RESOLVED', 'CANCELLED'],
  RESOLVED: ['UNDER_REVIEW'],
  CANCELLED: ['UNDER_REVIEW'],
};

export function validateDisputeStateTransition(
  currentStatus: DisputeStatus,
  targetStatus: DisputeStatus,
): void {
  if (currentStatus === targetStatus) {
    return;
  }

  const allowed = ALLOWED_TRANSITIONS[currentStatus];
  if (!allowed || !allowed.includes(targetStatus)) {
    throw new InvalidDisputeStateTransitionError(currentStatus, targetStatus);
  }
}
