import {
  calculateHaversineDistance,
  validateCoordinates,
} from '@/modules/location/application/distance-service';
import type { RouteEstimate, RouteEstimateInput } from '../domain/pricing-types';
import { InvalidRouteCoordinatesError } from '../domain/pricing-errors';

export interface RouteProvider {
  estimateRoute(input: RouteEstimateInput): Promise<RouteEstimate>;
}

/**
 * Deterministic local development route provider.
 * Produces 100% reproducible distance and duration estimates for identical coordinate inputs
 * without requiring external third-party API credentials.
 */
export class DeterministicRouteProvider implements RouteProvider {
  async estimateRoute(input: RouteEstimateInput): Promise<RouteEstimate> {
    const { pickup, dropoff } = input;

    try {
      validateCoordinates(pickup.latitude, pickup.longitude);
    } catch {
      throw new InvalidRouteCoordinatesError(pickup.latitude, pickup.longitude);
    }

    if (
      !dropoff ||
      (dropoff.latitude === pickup.latitude && dropoff.longitude === pickup.longitude)
    ) {
      // Default fallback for driver-only local booking without explicit dropoff
      const defaultDistanceMeters = 10000; // 10 km
      const defaultDurationSeconds = 1800; // 30 mins
      return {
        distanceMeters: defaultDistanceMeters,
        distanceKm: 10.0,
        durationSeconds: defaultDurationSeconds,
        durationMinutes: 30,
        provider: 'DETERMINISTIC_DEVELOPMENT',
        isEstimate: true,
      };
    }

    try {
      validateCoordinates(dropoff.latitude, dropoff.longitude);
    } catch {
      throw new InvalidRouteCoordinatesError(dropoff.latitude, dropoff.longitude);
    }

    const haversineMeters = calculateHaversineDistance(
      pickup.latitude,
      pickup.longitude,
      dropoff.latitude,
      dropoff.longitude,
    );

    // Apply road circuity multiplier (1.25 for typical urban road networks vs straight line)
    const distanceMeters = Math.max(1000, Math.round(haversineMeters * 1.25));
    const distanceKm = Number((distanceMeters / 1000).toFixed(2));

    // Assume 30 km/h (500 meters per minute) urban traffic speed + 5 min pickup buffer
    const durationMinutes = Math.max(10, Math.ceil(distanceMeters / 500) + 5);
    const durationSeconds = durationMinutes * 60;

    return {
      distanceMeters,
      distanceKm,
      durationSeconds,
      durationMinutes,
      provider: 'DETERMINISTIC_DEVELOPMENT',
      isEstimate: true,
    };
  }
}

export const defaultRouteProvider: RouteProvider = new DeterministicRouteProvider();
