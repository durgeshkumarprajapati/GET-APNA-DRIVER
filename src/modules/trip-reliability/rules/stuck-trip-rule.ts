import type { RuleEvaluationInput, RuleEvaluationResult } from '../trip-reliability-types';
import { getTripReliabilityConfig } from '../trip-reliability-config';

export function evaluateStuckTrip(input: RuleEvaluationInput): RuleEvaluationResult | null {
  const activeStatuses = ['DRIVER_ASSIGNED', 'DRIVER_EN_ROUTE', 'DRIVER_ARRIVED', 'TRIP_IN_PROGRESS', 'IN_PROGRESS'];
  if (!activeStatuses.includes(input.status)) return null;

  const config = getTripReliabilityConfig();
  const lastUpdate = input.updatedAt ? new Date(input.updatedAt).getTime() : Date.now();
  const elapsedMinutes = Math.floor((Date.now() - lastUpdate) / (1000 * 60));

  if (elapsedMinutes >= config.stuckTripMinutes) {
    return {
      detected: true,
      type: 'TRIP_STUCK',
      severity: 'HIGH',
      confidence: 'HIGH',
      reason: `Booking stuck in '${input.status}' state for ${elapsedMinutes} minutes without lifecycle state transition.`,
      metadata: { elapsedMinutes, status: input.status, thresholdMinutes: config.stuckTripMinutes },
    };
  }

  return null;
}
