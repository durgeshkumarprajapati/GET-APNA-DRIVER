import 'server-only';
import type { LocationFreshnessState } from './location-intelligence-types';

export const LOCATION_POLICY = {
  // Location Freshness Thresholds (in seconds)
  FRESHNESS: {
    LIVE_MAX_SECONDS: 30,
    RECENT_MAX_SECONDS: 120,
    STALE_MAX_SECONDS: 300,
  },
  // Proximity Thresholds (in meters)
  PROXIMITY: {
    NEAR_PICKUP_METERS: 500,
    ARRIVED_PICKUP_METERS: 50,
    NEAR_DESTINATION_METERS: 500,
    ARRIVED_DESTINATION_METERS: 50,
  },
  // Anomaly & Validation Thresholds
  ANOMALY: {
    MAX_REALISTIC_SPEED_KMH: 180, // e.g. 180 km/h
    TELEPORT_MIN_SPEED_KMH: 300,
    MAX_ACCURACY_METERS: 100,
  },
  // ETA Caching & Rate Limiting
  ETA: {
    CACHE_TTL_ACTIVE_TRIP_SECONDS: 30,
    CACHE_TTL_INACTIVE_SECONDS: 120,
    MIN_REFRESH_INTERVAL_SECONDS: 15,
  },
} as const;

export function evaluateLocationFreshnessState(capturedAt?: Date | string | null): {
  freshness: LocationFreshnessState;
  ageSeconds: number;
} {
  if (!capturedAt) {
    return { freshness: 'UNAVAILABLE', ageSeconds: 999999 };
  }

  const capturedTime =
    typeof capturedAt === 'string' ? new Date(capturedAt).getTime() : capturedAt.getTime();
  if (isNaN(capturedTime)) {
    return { freshness: 'UNAVAILABLE', ageSeconds: 999999 };
  }

  const now = Date.now();
  const ageSeconds = Math.max(0, Math.floor((now - capturedTime) / 1000));

  if (ageSeconds <= LOCATION_POLICY.FRESHNESS.LIVE_MAX_SECONDS) {
    return { freshness: 'LIVE', ageSeconds };
  }
  if (ageSeconds <= LOCATION_POLICY.FRESHNESS.RECENT_MAX_SECONDS) {
    return { freshness: 'RECENT', ageSeconds };
  }
  if (ageSeconds <= LOCATION_POLICY.FRESHNESS.STALE_MAX_SECONDS) {
    return { freshness: 'STALE', ageSeconds };
  }

  return { freshness: 'UNAVAILABLE', ageSeconds };
}
