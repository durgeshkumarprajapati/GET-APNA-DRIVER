import 'server-only';
import type { LocationConfidenceLevel } from './location-intelligence-types';

export type RouteProviderType = 'GOOGLE' | 'MAPBOX' | 'DETERMINISTIC_FALLBACK';

export type ETAStatus = 'AVAILABLE' | 'STALE' | 'UNAVAILABLE' | 'ESTIMATED';

export interface RouteEstimateRequest {
  origin: {
    latitude: number;
    longitude: number;
  };
  destination: {
    latitude: number;
    longitude: number;
  };
  mode?: 'driving' | 'walking';
  bookingId?: string;
  context?: 'DRIVER_TO_PICKUP' | 'PICKUP_TO_DESTINATION' | 'GENERAL';
}

export interface ETAResult {
  durationSeconds: number;
  durationMinutes: number;
  distanceMeters: number;
  distanceKm: number;
  provider: RouteProviderType;
  confidence: LocationConfidenceLevel;
  status: ETAStatus;
  isEstimate: boolean;
  generatedAt: string;
  expiresAt: string;
  routeGeometry?: string | null;
}
