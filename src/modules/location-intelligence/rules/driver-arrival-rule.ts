import 'server-only';
import { evaluatePickupProximity } from './pickup-proximity-rule';
import { evaluateLocationFreshnessState } from '../domain/location-policy';
import { evaluateLocationConfidence } from '../domain/location-confidence';
import type { LocationPoint } from '../domain/location-intelligence-types';

export interface DriverArrivalCandidateEvaluation {
  isCandidateForArrival: boolean;
  distanceToPickupMeters: number;
  freshness: string;
  confidence: string;
  reason: string;
}

export function evaluateDriverArrivalCandidate(
  driverLocation: LocationPoint | null,
  pickupCoordinates: { latitude: number; longitude: number },
  allowedBookingStatus: string, // e.g. 'CONFIRMED' or 'DRIVER_EN_ROUTE'
): DriverArrivalCandidateEvaluation {
  if (!driverLocation) {
    return {
      isCandidateForArrival: false,
      distanceToPickupMeters: 999999,
      freshness: 'UNAVAILABLE',
      confidence: 'UNAVAILABLE',
      reason: 'Driver location data unavailable',
    };
  }

  // Arrival evaluation is only relevant if booking is in valid state (e.g. DRIVER_EN_ROUTE / CONFIRMED)
  if (
    allowedBookingStatus !== 'CONFIRMED' &&
    allowedBookingStatus !== 'DRIVER_ASSIGNED' &&
    allowedBookingStatus !== 'DRIVER_EN_ROUTE'
  ) {
    return {
      isCandidateForArrival: false,
      distanceToPickupMeters: 999999,
      freshness: 'UNAVAILABLE',
      confidence: 'UNAVAILABLE',
      reason: `Booking status '${allowedBookingStatus}' does not permit arrival state transition`,
    };
  }

  const { freshness } = evaluateLocationFreshnessState(driverLocation.capturedAt);
  if (freshness === 'STALE' || freshness === 'UNAVAILABLE') {
    return {
      isCandidateForArrival: false,
      distanceToPickupMeters: 999999,
      freshness,
      confidence: 'LOW',
      reason: 'Driver location data is stale or unavailable',
    };
  }

  const confidenceAssessment = evaluateLocationConfidence(driverLocation);
  if (confidenceAssessment.level === 'LOW' || confidenceAssessment.level === 'UNAVAILABLE') {
    return {
      isCandidateForArrival: false,
      distanceToPickupMeters: 999999,
      freshness,
      confidence: confidenceAssessment.level,
      reason: 'Driver location confidence is insufficient for arrival transition',
    };
  }

  const proximity = evaluatePickupProximity(driverLocation, pickupCoordinates);
  if (proximity.distanceMeters > 150) {
    return {
      isCandidateForArrival: false,
      distanceToPickupMeters: proximity.distanceMeters,
      freshness,
      confidence: confidenceAssessment.level,
      reason: `Driver distance (${proximity.distanceMeters}m) exceeds arrival candidate threshold (150m)`,
    };
  }

  return {
    isCandidateForArrival: true,
    distanceToPickupMeters: proximity.distanceMeters,
    freshness,
    confidence: confidenceAssessment.level,
    reason: `Driver candidate for arrival (${proximity.distanceMeters}m from pickup point)`,
  };
}
