import 'server-only';
import {
  calculateHaversineDistance,
  validateCoordinates,
} from '@/modules/location/application/distance-service';
import type { RouteProvider } from './route-provider';
import type { RouteEstimateRequest, ETAResult } from '../domain/eta-types';

export class DeterministicRouteProvider implements RouteProvider {
  readonly providerName = 'DETERMINISTIC_FALLBACK' as const;

  async isAvailable(): Promise<boolean> {
    return true; // Always available as tertiary fallback
  }

  async estimateRoute(request: RouteEstimateRequest): Promise<ETAResult> {
    const { origin, destination } = request;

    validateCoordinates(origin.latitude, origin.longitude);
    validateCoordinates(destination.latitude, destination.longitude);

    const straightLineMeters = calculateHaversineDistance(
      origin.latitude,
      origin.longitude,
      destination.latitude,
      destination.longitude,
    );

    // Urban circuity factor of 1.25 (typical road distance multiplier over straight line)
    const distanceMeters = Math.max(100, Math.round(straightLineMeters * 1.25));
    const distanceKm = Number((distanceMeters / 1000).toFixed(2));

    // Assume average urban speed of 30 km/h (500 meters/min) + 3 min buffer for turn maneuvers
    const baseMinutes = Math.ceil(distanceMeters / 500);
    const durationMinutes = Math.max(1, baseMinutes + (distanceMeters > 500 ? 3 : 1));
    const durationSeconds = durationMinutes * 60;

    const now = new Date();
    const expiresAt = new Date(now.getTime() + 60 * 1000); // 60 sec TTL

    return {
      durationSeconds,
      durationMinutes,
      distanceMeters,
      distanceKm,
      provider: this.providerName,
      confidence: straightLineMeters > 50000 ? 'LOW' : 'MEDIUM',
      status: 'ESTIMATED',
      isEstimate: true,
      generatedAt: now.toISOString(),
      expiresAt: expiresAt.toISOString(),
    };
  }
}
