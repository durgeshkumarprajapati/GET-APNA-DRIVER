import type { RuleEvaluationInput, RuleEvaluationResult } from '../trip-reliability-types';
import { getTripReliabilityConfig } from '../trip-reliability-config';

export function evaluatePickupDelay(input: RuleEvaluationInput): RuleEvaluationResult | null {
  if (input.status !== 'DRIVER_EN_ROUTE' && input.status !== 'DRIVER_ASSIGNED') return null;

  const config = getTripReliabilityConfig();
  const startTime = input.driverEnRouteAt || input.updatedAt || input.createdAt;
  if (!startTime) return null;

  const elapsedSeconds = Math.floor((Date.now() - new Date(startTime).getTime()) / 1000);

  if (elapsedSeconds >= config.pickupDelaySeconds) {
    return {
      detected: true,
      type: 'PICKUP_DELAY',
      severity: elapsedSeconds >= config.pickupDelaySeconds * 2 ? 'HIGH' : 'MEDIUM',
      confidence: 'HIGH',
      reason: `Driver en-route to pickup delayed beyond threshold (${elapsedSeconds}s).`,
      metadata: { elapsedSeconds, thresholdSeconds: config.pickupDelaySeconds },
    };
  }

  return null;
}
