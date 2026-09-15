import type { RuleEvaluationInput, RuleEvaluationResult } from '../trip-reliability-types';
import { getTripReliabilityConfig } from '../trip-reliability-config';

export function evaluateLocationStale(input: RuleEvaluationInput): RuleEvaluationResult | null {
  const activeStatuses = ['DRIVER_EN_ROUTE', 'DRIVER_ARRIVED', 'TRIP_IN_PROGRESS', 'IN_PROGRESS'];
  if (!activeStatuses.includes(input.status)) return null;

  if (!input.latestTelemetryCapturedAt) {
    return {
      detected: true,
      type: 'DRIVER_LOCATION_STALE',
      severity: 'MEDIUM',
      confidence: 'MEDIUM',
      reason: 'Driver telemetry location is unavailable during active trip phase.',
      metadata: { freshnessAgeSeconds: Infinity },
    };
  }

  const config = getTripReliabilityConfig();
  const telemetryTime = new Date(input.latestTelemetryCapturedAt).getTime();
  const freshnessAgeSeconds = Math.floor((Date.now() - telemetryTime) / 1000);

  if (freshnessAgeSeconds >= config.locationStaleSeconds) {
    return {
      detected: true,
      type: 'DRIVER_LOCATION_STALE',
      severity: freshnessAgeSeconds > config.locationStaleSeconds * 3 ? 'HIGH' : 'MEDIUM',
      confidence: freshnessAgeSeconds > config.locationStaleSeconds * 2 ? 'HIGH' : 'MEDIUM',
      reason: `Driver location update is stale (${freshnessAgeSeconds}s since last update).`,
      metadata: { freshnessAgeSeconds, thresholdSeconds: config.locationStaleSeconds },
    };
  }

  return null;
}
