import type { RuleEvaluationInput, RuleEvaluationResult } from '../trip-reliability-types';
import { getTripReliabilityConfig } from '../trip-reliability-config';

export function evaluateAssignmentTimeout(input: RuleEvaluationInput): RuleEvaluationResult | null {
  if (input.status !== 'SEARCHING_DRIVER') return null;

  const config = getTripReliabilityConfig();
  const startTime = input.createdAt ? new Date(input.createdAt).getTime() : Date.now();
  const elapsedSeconds = Math.floor((Date.now() - startTime) / 1000);

  if (elapsedSeconds >= config.assignmentTimeoutSeconds) {
    return {
      detected: true,
      type: 'ASSIGNMENT_TIMEOUT',
      severity: 'HIGH',
      confidence: 'HIGH',
      reason: `Booking driver search has timed out after ${elapsedSeconds} seconds without driver assignment.`,
      metadata: { elapsedSeconds, thresholdSeconds: config.assignmentTimeoutSeconds },
    };
  }

  return null;
}
