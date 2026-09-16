import type { LocationFreshness } from '../trip-intelligence-types';
import { getTripIntelligenceConfig } from '../trip-intelligence-config';

export function calculateHaversineDistanceMeters(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  const R = 6371000; // Radius of Earth in meters
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c);
}

export function evaluateLocationFreshness(capturedAt?: Date | string | null): {
  freshness: LocationFreshness;
  freshnessSeconds: number;
} {
  if (!capturedAt) {
    return { freshness: 'UNAVAILABLE', freshnessSeconds: 999999 };
  }

  const capturedTime =
    typeof capturedAt === 'string' ? new Date(capturedAt).getTime() : capturedAt.getTime();
  const now = Date.now();
  const diffSeconds = Math.max(0, Math.floor((now - capturedTime) / 1000));
  const config = getTripIntelligenceConfig();

  if (diffSeconds <= 15) {
    return { freshness: 'LIVE', freshnessSeconds: diffSeconds };
  }
  if (diffSeconds <= config.locationStaleThresholdSeconds) {
    return { freshness: 'RECENT', freshnessSeconds: diffSeconds };
  }
  if (diffSeconds <= config.delayThresholdSeconds) {
    return { freshness: 'STALE', freshnessSeconds: diffSeconds };
  }

  return { freshness: 'UNAVAILABLE', freshnessSeconds: diffSeconds };
}
