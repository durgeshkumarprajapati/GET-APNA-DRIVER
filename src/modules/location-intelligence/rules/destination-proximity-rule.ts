import 'server-only';
import { calculateHaversineDistance } from '@/modules/location/application/distance-service';
import { LOCATION_POLICY } from '../domain/location-policy';
import type { LocationPoint } from '../domain/location-intelligence-types';

export interface DestinationProximityEvaluation {
  isNearDestination: boolean;
  distanceMeters: number;
  signal: 'DESTINATION_FAR' | 'DESTINATION_NEAR' | 'DESTINATION_ARRIVED';
}

export function evaluateDestinationProximity(
  driverLocation: LocationPoint | null,
  destinationCoordinates: { latitude: number; longitude: number } | null,
): DestinationProximityEvaluation {
  if (!driverLocation || !destinationCoordinates) {
    return {
      isNearDestination: false,
      distanceMeters: 999999,
      signal: 'DESTINATION_FAR',
    };
  }

  const distanceMeters = calculateHaversineDistance(
    driverLocation.latitude,
    driverLocation.longitude,
    destinationCoordinates.latitude,
    destinationCoordinates.longitude,
  );

  let signal: 'DESTINATION_FAR' | 'DESTINATION_NEAR' | 'DESTINATION_ARRIVED' = 'DESTINATION_FAR';
  if (distanceMeters <= LOCATION_POLICY.PROXIMITY.ARRIVED_DESTINATION_METERS) {
    signal = 'DESTINATION_ARRIVED';
  } else if (distanceMeters <= LOCATION_POLICY.PROXIMITY.NEAR_DESTINATION_METERS) {
    signal = 'DESTINATION_NEAR';
  }

  return {
    isNearDestination: distanceMeters <= LOCATION_POLICY.PROXIMITY.NEAR_DESTINATION_METERS,
    distanceMeters,
    signal,
  };
}
