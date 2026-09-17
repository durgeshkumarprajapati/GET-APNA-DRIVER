import 'server-only';
import { calculateHaversineDistance } from '@/modules/location/application/distance-service';
import { LOCATION_POLICY } from '../domain/location-policy';
import type { LocationPoint } from '../domain/location-intelligence-types';

export type PickupProximitySignal =
  | 'DRIVER_FAR_FROM_PICKUP'
  | 'DRIVER_NEAR_PICKUP'
  | 'DRIVER_AT_PICKUP';

export interface PickupProximityEvaluation {
  signal: PickupProximitySignal;
  distanceMeters: number;
  isNearPickup: boolean;
  isAtPickup: boolean;
}

export function evaluatePickupProximity(
  driverLocation: LocationPoint | null,
  pickupCoordinates: { latitude: number; longitude: number },
  customNearRadiusMeters?: number,
): PickupProximityEvaluation {
  if (!driverLocation) {
    return {
      signal: 'DRIVER_FAR_FROM_PICKUP',
      distanceMeters: 999999,
      isNearPickup: false,
      isAtPickup: false,
    };
  }

  const distanceMeters = calculateHaversineDistance(
    driverLocation.latitude,
    driverLocation.longitude,
    pickupCoordinates.latitude,
    pickupCoordinates.longitude,
  );

  const nearThreshold = customNearRadiusMeters ?? LOCATION_POLICY.PROXIMITY.NEAR_PICKUP_METERS;
  const arrivedThreshold = LOCATION_POLICY.PROXIMITY.ARRIVED_PICKUP_METERS;

  let signal: PickupProximitySignal = 'DRIVER_FAR_FROM_PICKUP';
  if (distanceMeters <= arrivedThreshold) {
    signal = 'DRIVER_AT_PICKUP';
  } else if (distanceMeters <= nearThreshold) {
    signal = 'DRIVER_NEAR_PICKUP';
  }

  return {
    signal,
    distanceMeters,
    isNearPickup: distanceMeters <= nearThreshold,
    isAtPickup: distanceMeters <= arrivedThreshold,
  };
}
