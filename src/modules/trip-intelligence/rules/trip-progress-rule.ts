import { calculateHaversineDistanceMeters } from './location-freshness-rule';
import { getTripIntelligenceConfig } from '../trip-intelligence-config';

export interface ProgressRuleInput {
  status: string;
  dropoffLatitude?: number | null;
  dropoffLongitude?: number | null;
  driverLatitude?: number | null;
  driverLongitude?: number | null;
}

export function evaluateDestinationProximity(input: ProgressRuleInput): {
  isNearDestination: boolean;
  distanceMeters?: number;
} {
  if (input.status !== 'TRIP_IN_PROGRESS') {
    return { isNearDestination: false };
  }

  if (
    !input.dropoffLatitude ||
    !input.dropoffLongitude ||
    !input.driverLatitude ||
    !input.driverLongitude
  ) {
    return { isNearDestination: false };
  }

  const distanceMeters = calculateHaversineDistanceMeters(
    input.driverLatitude,
    input.driverLongitude,
    input.dropoffLatitude,
    input.dropoffLongitude,
  );

  const config = getTripIntelligenceConfig();
  const isNearDestination = distanceMeters <= config.nearDestinationRadiusMeters;

  return { isNearDestination, distanceMeters };
}
