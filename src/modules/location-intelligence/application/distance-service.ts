import 'server-only';
import {
  calculateHaversineDistance,
  validateCoordinates,
  toKmDisplay,
} from '@/modules/location/application/distance-service';
import type { LocationPoint } from '../domain/location-intelligence-types';

export interface TripDistances {
  driverToPickupMeters: number | null;
  driverToPickupKmDisplay: string | null;
  pickupToDestinationMeters: number | null;
  pickupToDestinationKmDisplay: string | null;
  driverToDestinationMeters: number | null;
  driverToDestinationKmDisplay: string | null;
}

export function computeTripDistances(
  driverLocation?: LocationPoint | null,
  pickupCoordinates?: { latitude: number; longitude: number } | null,
  destinationCoordinates?: { latitude: number; longitude: number } | null,
): TripDistances {
  let driverToPickupMeters: number | null = null;
  let pickupToDestinationMeters: number | null = null;
  let driverToDestinationMeters: number | null = null;

  if (driverLocation && pickupCoordinates) {
    try {
      validateCoordinates(driverLocation.latitude, driverLocation.longitude);
      validateCoordinates(pickupCoordinates.latitude, pickupCoordinates.longitude);
      driverToPickupMeters = calculateHaversineDistance(
        driverLocation.latitude,
        driverLocation.longitude,
        pickupCoordinates.latitude,
        pickupCoordinates.longitude,
      );
    } catch {
      driverToPickupMeters = null;
    }
  }

  if (pickupCoordinates && destinationCoordinates) {
    try {
      validateCoordinates(pickupCoordinates.latitude, pickupCoordinates.longitude);
      validateCoordinates(destinationCoordinates.latitude, destinationCoordinates.longitude);
      pickupToDestinationMeters = calculateHaversineDistance(
        pickupCoordinates.latitude,
        pickupCoordinates.longitude,
        destinationCoordinates.latitude,
        destinationCoordinates.longitude,
      );
    } catch {
      pickupToDestinationMeters = null;
    }
  }

  if (driverLocation && destinationCoordinates) {
    try {
      validateCoordinates(driverLocation.latitude, driverLocation.longitude);
      validateCoordinates(destinationCoordinates.latitude, destinationCoordinates.longitude);
      driverToDestinationMeters = calculateHaversineDistance(
        driverLocation.latitude,
        driverLocation.longitude,
        destinationCoordinates.latitude,
        destinationCoordinates.longitude,
      );
    } catch {
      driverToDestinationMeters = null;
    }
  }

  return {
    driverToPickupMeters,
    driverToPickupKmDisplay: driverToPickupMeters !== null ? toKmDisplay(driverToPickupMeters) : null,
    pickupToDestinationMeters,
    pickupToDestinationKmDisplay:
      pickupToDestinationMeters !== null ? toKmDisplay(pickupToDestinationMeters) : null,
    driverToDestinationMeters,
    driverToDestinationKmDisplay:
      driverToDestinationMeters !== null ? toKmDisplay(driverToDestinationMeters) : null,
  };
}

export { calculateHaversineDistance, validateCoordinates, toKmDisplay };
