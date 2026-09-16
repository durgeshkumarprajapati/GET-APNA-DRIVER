import type { RuleEvaluationInput, RuleEvaluationResult } from '../trip-reliability-types';

export function evaluateCustomerUnreachable(
  input: RuleEvaluationInput,
): RuleEvaluationResult | null {
  if (input.status !== 'DRIVER_ARRIVED') return null;

  if (input.driverArrivedAt) {
    const elapsedMinutes = Math.floor(
      (Date.now() - new Date(input.driverArrivedAt).getTime()) / (1000 * 60),
    );

    if (elapsedMinutes >= 15) {
      return {
        detected: true,
        type: 'CUSTOMER_UNREACHABLE',
        severity: 'MEDIUM',
        confidence: 'MEDIUM',
        reason: `Driver has been waiting at pickup location for ${elapsedMinutes} minutes.`,
        metadata: { elapsedMinutes },
      };
    }
  }

  return null;
}
