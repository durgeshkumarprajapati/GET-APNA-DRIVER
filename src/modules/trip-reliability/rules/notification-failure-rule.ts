import type { RuleEvaluationInput, RuleEvaluationResult } from '../trip-reliability-types';

export function evaluateNotificationFailure(input: RuleEvaluationInput): RuleEvaluationResult | null {
  if (input.notificationFailedCount && input.notificationFailedCount >= 3) {
    return {
      detected: true,
      type: 'NOTIFICATION_FAILURE',
      severity: 'LOW',
      confidence: 'HIGH',
      reason: `Critical notification delivery failed repeatedly (${input.notificationFailedCount} failures).`,
      metadata: { failedCount: input.notificationFailedCount },
    };
  }

  return null;
}
