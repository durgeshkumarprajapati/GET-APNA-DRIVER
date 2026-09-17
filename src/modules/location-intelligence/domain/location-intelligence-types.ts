import 'server-only';

export type LocationPointSource =
  | 'DRIVER_DEVICE'
  | 'CUSTOMER_DEVICE'
  | 'SERVER'
  | 'BOOKING'
  | 'UNKNOWN';

export interface LocationPoint {
  latitude: number;
  longitude: number;
  accuracyMeters?: number | null;
  heading?: number | null;
  speed?: number | null;
  capturedAt: Date | string;
  source: LocationPointSource;
  freshness?: LocationFreshnessState;
}

export type LocationFreshnessState = 'LIVE' | 'RECENT' | 'STALE' | 'UNAVAILABLE';

export type LocationConfidenceLevel = 'HIGH' | 'MEDIUM' | 'LOW' | 'UNAVAILABLE';

export interface LocationConfidenceAssessment {
  level: LocationConfidenceLevel;
  score: number; // 0-100
  factors: {
    timestampAgeSeconds: number;
    accuracyMeters: number | null;
    isCoordinatesValid: boolean;
    movementConsistent: boolean;
    telemetryAvailable: boolean;
  };
  explanation: string;
}

export interface LocationAnomalyReport {
  isAnomaly: boolean;
  type?: 'IMPOSSIBLE_SPEED' | 'TELEPORTATION' | 'INVALID_COORDINATES' | 'GPS_DRIFT_EXCESSIVE';
  confidence: LocationConfidenceLevel;
  reason?: string;
  observedSpeedKmH?: number;
  distanceKm?: number;
  timeDiffSeconds?: number;
}
