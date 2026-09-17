import type { RuleEvaluationInput, RuleEvaluationResult } from '../trip-reliability-types';

export function evaluateScheduledRideFailure(
  input: RuleEvaluationInput,
): RuleEvaluationResult | null {
  if (input.scheduledRideMissedDispatch) {
    return {
      detected: true,
      type: 'SCHEDULED_RIDE_FAILURE',
      severity: 'HIGH',
      confidence: 'HIGH',
      reason:
        'Scheduled ride occurrence failed to start dispatch search at scheduled dispatch window.',
      metadata: { scheduledPickupTime: input.scheduledPickupTime },
    };
  }

  return null;
}
