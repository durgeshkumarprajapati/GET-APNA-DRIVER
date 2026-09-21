import 'server-only';
import {
  evaluatePickupProximity,
  type PickupProximityEvaluation,
} from '../rules/pickup-proximity-rule';
import {
  evaluatePickupZoneIntelligence,
  type PickupZoneIntelligence,
} from '../rules/pickup-zone-rule';
import { evaluateDriverArrivalCandidate } from '../rules/driver-arrival-rule';
import { toKmDisplay } from '@/modules/location/application/distance-service';
import type { LocationPoint } from '../domain/location-intelligence-types';
import type { ETAResult } from '../domain/eta-types';

export interface DriverPickupGuidance {
  distanceMeters: number;
  distanceDisplay: string;
  eta: ETAResult | null;
  proximity: PickupProximityEvaluation;
  zoneInfo: PickupZoneIntelligence;
  arrivalCandidate: boolean;
  freshness: string;
  confidence: string;
  suggestedAction: string;
}

export async function generateDriverPickupGuidance(
  driverLocation: LocationPoint | null,
  pickupCoordinates: { latitude: number; longitude: number },
  bookingStatus: string,
  eta: ETAResult | null,
): Promise<DriverPickupGuidance> {
  const proximity = evaluatePickupProximity(driverLocation, pickupCoordinates);
  const zoneInfo = await evaluatePickupZoneIntelligence(
    pickupCoordinates.latitude,
    pickupCoordinates.longitude,
  );
  const arrivalEval = evaluateDriverArrivalCandidate(
    driverLocation,
    pickupCoordinates,
    bookingStatus,
  );

  let suggestedAction = 'Head towards the designated pickup point';
  if (proximity.signal === 'DRIVER_AT_PICKUP') {
    suggestedAction = 'You have arrived at the pickup location. Contact customer or tap Arrived.';
  } else if (proximity.signal === 'DRIVER_NEAR_PICKUP') {
    suggestedAction = 'You are within 500m of the pickup point. Prepare for customer arrival.';
  } else if (driverLocation?.freshness === 'STALE' || driverLocation?.freshness === 'UNAVAILABLE') {
    suggestedAction = 'GPS signal is weak or stale. Check location services.';
  }

  return {
    distanceMeters: proximity.distanceMeters,
    distanceDisplay:
      proximity.distanceMeters !== 999999 ? toKmDisplay(proximity.distanceMeters) : 'Unknown',
    eta,
    proximity,
    zoneInfo,
    arrivalCandidate: arrivalEval.isCandidateForArrival,
    freshness: driverLocation?.freshness || 'UNAVAILABLE',
    confidence: driverLocation ? 'HIGH' : 'UNAVAILABLE',
    suggestedAction,
  };
}
