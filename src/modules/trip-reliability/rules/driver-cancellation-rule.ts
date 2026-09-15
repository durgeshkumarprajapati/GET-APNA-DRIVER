import type { RuleEvaluationInput, RuleEvaluationResult } from '../trip-reliability-types';

export function evaluateDriverCancellation(input: RuleEvaluationInput): RuleEvaluationResult | null {
  if (input.status === 'CANCELLED' && input.driverProfileId) {
    return {
      detected: true,
      type: 'DRIVER_CANCELLED',
      severity: 'HIGH',
      confidence: 'HIGH',
      reason: 'Assigned driver cancelled the booking after assignment.',
      metadata: { driverProfileId: input.driverProfileId },
    };
  }

  return null;
}
