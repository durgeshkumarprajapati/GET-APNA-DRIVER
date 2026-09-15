import type { RuleEvaluationInput, RuleEvaluationResult } from '../trip-reliability-types';
import { getTripReliabilityConfig } from '../trip-reliability-config';

export function evaluateDispatchFailure(input: RuleEvaluationInput): RuleEvaluationResult | null {
  const config = getTripReliabilityConfig();
  const attemptCount = input.dispatchAttemptCount || 0;

  if (attemptCount >= config.dispatchRetryLimit) {
    return {
      detected: true,
      type: 'DISPATCH_FAILURE',
      severity: 'HIGH',
      confidence: 'HIGH',
      reason: `Repeated dispatch failure reached threshold (${attemptCount} attempts). Reason: ${input.lastDispatchFailureReason || 'NO_RESPONSIVE_DRIVERS'}`,
      metadata: { attemptCount, lastReason: input.lastDispatchFailureReason },
    };
  }

  if (attemptCount > 0 && input.lastDispatchFailureReason === 'NO_DRIVER_AVAILABLE') {
    return {
      detected: true,
      type: 'NO_DRIVER_AVAILABLE',
      severity: 'MEDIUM',
      confidence: 'HIGH',
      reason: 'No eligible driver available in dispatch radius for search criteria.',
      metadata: { attemptCount },
    };
  }

  return null;
}
