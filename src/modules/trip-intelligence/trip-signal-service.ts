import { evaluateLocationFreshness } from './rules/location-freshness-rule';
import { evaluatePickupDelayRisk } from './rules/pickup-delay-rule';
import { evaluateDriverProximityToPickup } from './rules/driver-arrival-rule';
import { evaluateDestinationProximity } from './rules/trip-progress-rule';
import type { TripSignalType, LocationFreshness } from './trip-intelligence-types';

export interface SignalExtractionInput {
  status: string;
  pickupLatitude: number;
  pickupLongitude: number;
  dropoffLatitude?: number | null;
  dropoffLongitude?: number | null;
  driverEnRouteAt?: Date | string | null;
  driverArrivedAt?: Date | string | null;
  tripStartedAt?: Date | string | null;
  tripCompletedAt?: Date | string | null;
  driverTelemetry?: {
    latitude: number;
    longitude: number;
    capturedAt?: Date | string | null;
  } | null;
  activeSafetyIncident?: boolean;
}

export interface SignalExtractionResult {
  signalType: TripSignalType;
  freshness: LocationFreshness;
  freshnessSeconds: number;
  distanceMeters?: number;
}

export class TripSignalService {
  extractSignal(input: SignalExtractionInput): SignalExtractionResult {
    const { freshness, freshnessSeconds } = evaluateLocationFreshness(
      input.driverTelemetry?.capturedAt,
    );

    if (input.activeSafetyIncident) {
      return {
        signalType: 'SAFETY_REQUIRED',
        freshness,
        freshnessSeconds,
      };
    }

    if (input.status === 'TRIP_COMPLETED' || input.status === 'COMPLETED') {
      return {
        signalType: 'TRIP_COMPLETED',
        freshness,
        freshnessSeconds,
      };
    }

    if (input.status === 'TRIP_IN_PROGRESS' || input.status === 'IN_PROGRESS') {
      const destCheck = evaluateDestinationProximity({
        status: input.status,
        dropoffLatitude: input.dropoffLatitude,
        dropoffLongitude: input.dropoffLongitude,
        driverLatitude: input.driverTelemetry?.latitude,
        driverLongitude: input.driverTelemetry?.longitude,
      });

      if (destCheck.isNearDestination) {
        return {
          signalType: 'DESTINATION_NEAR',
          freshness,
          freshnessSeconds,
          distanceMeters: destCheck.distanceMeters,
        };
      }

      return {
        signalType: 'TRIP_STARTED',
        freshness,
        freshnessSeconds,
      };
    }

    if (input.status === 'DRIVER_ARRIVED') {
      return {
        signalType: 'DRIVER_ARRIVED',
        freshness,
        freshnessSeconds,
      };
    }

    if (
      input.status === 'DRIVER_EN_ROUTE' ||
      input.status === 'DRIVER_ASSIGNED' ||
      input.status === 'ASSIGNED'
    ) {
      const delayRisk = evaluatePickupDelayRisk({
        status: input.status,
        driverEnRouteAt: input.driverEnRouteAt,
        freshness,
        freshnessSeconds,
      });

      if (delayRisk) {
        return {
          signalType: 'TRIP_DELAY_RISK',
          freshness,
          freshnessSeconds,
        };
      }

      const proximityCheck = evaluateDriverProximityToPickup({
        status: input.status,
        pickupLatitude: input.pickupLatitude,
        pickupLongitude: input.pickupLongitude,
        driverLatitude: input.driverTelemetry?.latitude,
        driverLongitude: input.driverTelemetry?.longitude,
      });

      if (proximityCheck.isNearPickup) {
        return {
          signalType: 'DRIVER_NEAR_PICKUP',
          freshness,
          freshnessSeconds,
          distanceMeters: proximityCheck.distanceMeters,
        };
      }

      if (input.status === 'DRIVER_EN_ROUTE' || input.driverEnRouteAt) {
        return {
          signalType: 'DRIVER_EN_ROUTE',
          freshness,
          freshnessSeconds,
        };
      }

      return {
        signalType: 'DRIVER_ASSIGNED',
        freshness,
        freshnessSeconds,
      };
    }

    return {
      signalType: 'DRIVER_ASSIGNED',
      freshness,
      freshnessSeconds,
    };
  }
}
