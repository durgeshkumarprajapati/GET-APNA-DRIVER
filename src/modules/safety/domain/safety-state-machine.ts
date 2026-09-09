import { SafetyIncidentStatus } from '@prisma/client';

export class InvalidSafetyStateTransitionError extends Error {
  constructor(
    public currentStatus: SafetyIncidentStatus,
    public targetStatus: SafetyIncidentStatus,
  ) {
    super(`Cannot transition safety incident status from ${currentStatus} to ${targetStatus}`);
    this.name = 'InvalidSafetyStateTransitionError';
  }
}

const ALLOWED_TRANSITIONS: Record<SafetyIncidentStatus, readonly SafetyIncidentStatus[]> = {
  OPEN: ['ACKNOWLEDGED', 'INVESTIGATING', 'RESOLVED', 'ESCALATED'],
  ACKNOWLEDGED: ['INVESTIGATING', 'RESOLVED', 'ESCALATED'],
  INVESTIGATING: ['RESOLVED', 'ESCALATED'],
  ESCALATED: ['INVESTIGATING', 'RESOLVED'],
  RESOLVED: ['INVESTIGATING'],
};

export function validateSafetyStateTransition(
  currentStatus: SafetyIncidentStatus,
  targetStatus: SafetyIncidentStatus,
): void {
  if (currentStatus === targetStatus) {
    return; // No-op
  }

  const allowed = ALLOWED_TRANSITIONS[currentStatus];
  if (!allowed || !allowed.includes(targetStatus)) {
    throw new InvalidSafetyStateTransitionError(currentStatus, targetStatus);
  }
}
