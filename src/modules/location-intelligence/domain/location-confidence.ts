import 'server-only';
import { validateCoordinates } from '@/modules/location/application/distance-service';
import { LOCATION_POLICY } from './location-policy';
import type {
  LocationPoint,
  LocationConfidenceAssessment,
  LocationAnomalyReport,
} from './location-intelligence-types';

/**
 * Computes deterministic, explainable location confidence level without AI.
 */
export function evaluateLocationConfidence(point: LocationPoint): LocationConfidenceAssessment {
  let isCoordinatesValid = true;
  try {
    validateCoordinates(point.latitude, point.longitude);
  } catch {
    isCoordinatesValid = false;
  }

  if (!isCoordinatesValid) {
    return {
      level: 'UNAVAILABLE',
      score: 0,
      factors: {
        timestampAgeSeconds: 999999,
        accuracyMeters: point.accuracyMeters ?? null,
        isCoordinatesValid: false,
        movementConsistent: false,
        telemetryAvailable: false,
      },
      explanation: 'Invalid coordinate bounds',
    };
  }

  const capturedTime =
    typeof point.capturedAt === 'string'
      ? new Date(point.capturedAt).getTime()
      : point.capturedAt.getTime();
  const timestampAgeSeconds = Math.max(0, Math.floor((Date.now() - capturedTime) / 1000));
  const accuracy = point.accuracyMeters ?? 15; // default 15m if unpopulated

  let score = 100;

  // Age penalties
  if (timestampAgeSeconds > LOCATION_POLICY.FRESHNESS.STALE_MAX_SECONDS) {
    score -= 60;
  } else if (timestampAgeSeconds > LOCATION_POLICY.FRESHNESS.RECENT_MAX_SECONDS) {
    score -= 30;
  } else if (timestampAgeSeconds > LOCATION_POLICY.FRESHNESS.LIVE_MAX_SECONDS) {
    score -= 10;
  }

  // Accuracy penalties
  if (accuracy > 100) {
    score -= 40;
  } else if (accuracy > 50) {
    score -= 20;
  } else if (accuracy > 20) {
    score -= 5;
  }

  score = Math.max(0, Math.min(100, score));

  let level: 'HIGH' | 'MEDIUM' | 'LOW' | 'UNAVAILABLE' = 'HIGH';
  if (score >= 80) level = 'HIGH';
  else if (score >= 50) level = 'MEDIUM';
  else if (score > 0) level = 'LOW';
  else level = 'UNAVAILABLE';

  return {
    level,
    score,
    factors: {
      timestampAgeSeconds,
      accuracyMeters: point.accuracyMeters ?? null,
      isCoordinatesValid: true,
      movementConsistent: true,
      telemetryAvailable: true,
    },
    explanation: `Confidence level ${level} (score: ${score}/100, age: ${timestampAgeSeconds}s, accuracy: ${accuracy}m)`,
  };
}

/**
 * Detects deterministic location anomalies such as impossible speed or teleportation.
 */
export function detectLocationAnomaly(
  previousPoint: LocationPoint | null,
  currentPoint: LocationPoint,
  distanceMeters: number,
): LocationAnomalyReport {
  try {
    validateCoordinates(currentPoint.latitude, currentPoint.longitude);
  } catch {
    return {
      isAnomaly: true,
      type: 'INVALID_COORDINATES',
      confidence: 'HIGH',
      reason: 'Current coordinates fail basic boundary validation',
    };
  }

  if (!previousPoint) {
    return { isAnomaly: false, confidence: 'HIGH' };
  }

  const prevTime =
    typeof previousPoint.capturedAt === 'string'
      ? new Date(previousPoint.capturedAt).getTime()
      : previousPoint.capturedAt.getTime();
  const currTime =
    typeof currentPoint.capturedAt === 'string'
      ? new Date(currentPoint.capturedAt).getTime()
      : currentPoint.capturedAt.getTime();

  const timeDiffSeconds = Math.max(0, Math.floor((currTime - prevTime) / 1000));
  if (timeDiffSeconds <= 0) {
    return { isAnomaly: false, confidence: 'HIGH' };
  }

  const distanceKm = distanceMeters / 1000;
  const observedSpeedKmH = Math.round((distanceKm / (timeDiffSeconds / 3600)) * 10) / 10;

  if (observedSpeedKmH > LOCATION_POLICY.ANOMALY.TELEPORT_MIN_SPEED_KMH) {
    return {
      isAnomaly: true,
      type: 'TELEPORTATION',
      confidence: 'HIGH',
      reason: `Calculated speed ${observedSpeedKmH} km/h exceeds teleportation threshold (${LOCATION_POLICY.ANOMALY.TELEPORT_MIN_SPEED_KMH} km/h)`,
      observedSpeedKmH,
      distanceKm,
      timeDiffSeconds,
    };
  }

  if (observedSpeedKmH > LOCATION_POLICY.ANOMALY.MAX_REALISTIC_SPEED_KMH) {
    return {
      isAnomaly: true,
      type: 'IMPOSSIBLE_SPEED',
      confidence: 'HIGH',
      reason: `Calculated speed ${observedSpeedKmH} km/h exceeds realistic driving threshold (${LOCATION_POLICY.ANOMALY.MAX_REALISTIC_SPEED_KMH} km/h)`,
      observedSpeedKmH,
      distanceKm,
      timeDiffSeconds,
    };
  }

  return {
    isAnomaly: false,
    confidence: 'HIGH',
    observedSpeedKmH,
    distanceKm,
    timeDiffSeconds,
  };
}
