import { calculateHaversineDistanceMeters } from './location-freshness-rule';
import { getTripIntelligenceConfig } from '../trip-intelligence-config';

export interface ArrivalRuleInput {
  status: string;
  pickupLatitude: number;
  pickupLongitude: number;
  driverLatitude?: number | null;
  driverLongitude?: number | null;
}

export function evaluateDriverProximityToPickup(input: ArrivalRuleInput): {
  isNearPickup: boolean;
  distanceMeters?: number;
} {
  if (!input.driverLatitude || !input.driverLongitude) {
    return { isNearPickup: false };
  }

  const distanceMeters = calculateHaversineDistanceMeters(
    input.driverLatitude,
    input.driverLongitude,
    input.pickupLatitude,
    input.pickupLongitude,
  );

  const config = getTripIntelligenceConfig();
  const isNearPickup = distanceMeters <= config.nearPickupRadiusMeters;

  return { isNearPickup, distanceMeters };
}
