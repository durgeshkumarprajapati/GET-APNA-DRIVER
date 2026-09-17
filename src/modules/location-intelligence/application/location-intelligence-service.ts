import 'server-only';
import { prisma, type Db } from '@/shared/database/prisma';
import { defaultETAService } from './eta-service';
import { computeTripDistances } from './distance-service';
import { assessLocationConfidence } from './location-confidence-service';
import { generateDriverPickupGuidance } from './pickup-intelligence-service';
import { evaluatePickupProximity } from '../rules/pickup-proximity-rule';
import { evaluateDestinationProximity } from '../rules/destination-proximity-rule';
import { evaluateLocationFreshnessState } from '../domain/location-policy';
import { evaluatePickupZoneIntelligence } from '../rules/pickup-zone-rule';
import { getLocationTelemetryStats } from '../infrastructure/location-telemetry';
import type { LocationPoint, LocationConfidenceAssessment } from '../domain/location-intelligence-types';
import type { ETAResult } from '../domain/eta-types';

export interface BookingLocationIntelligence {
  bookingId: string;
  status: string;
  driverLocation: LocationPoint | null;
  pickupCoordinates: { latitude: number; longitude: number };
  destinationCoordinates: { latitude: number; longitude: number } | null;
  distances: ReturnType<typeof computeTripDistances>;
  etaToPickup: ETAResult | null;
  etaToDestination: ETAResult | null;
  pickupProximity: ReturnType<typeof evaluatePickupProximity>;
  destinationProximity: ReturnType<typeof evaluateDestinationProximity>;
  pickupZone: Awaited<ReturnType<typeof evaluatePickupZoneIntelligence>>;
  locationConfidence: LocationConfidenceAssessment;
  freshness: string;
}

export async function getBookingLocationIntelligence(
  bookingId: string,
  db: Db = prisma,
): Promise<BookingLocationIntelligence | null> {
  const booking = await db.booking.findUnique({
    where: { id: bookingId },
    select: {
      id: true,
      status: true,
      pickupLatitude: true,
      pickupLongitude: true,
      dropoffLatitude: true,
      dropoffLongitude: true,
      driverProfileId: true,
    },
  });

  if (!booking) return null;

  const pickupCoordinates = {
    latitude: booking.pickupLatitude,
    longitude: booking.pickupLongitude,
  };

  const destinationCoordinates =
    booking.dropoffLatitude !== null && booking.dropoffLongitude !== null
      ? { latitude: booking.dropoffLatitude, longitude: booking.dropoffLongitude }
      : null;

  let driverLocation: LocationPoint | null = null;
  if (booking.driverProfileId) {
    const rawLoc = await db.driverCurrentLocation.findUnique({
      where: { driverProfileId: booking.driverProfileId },
    });

    if (rawLoc) {
      const { freshness } = evaluateLocationFreshnessState(rawLoc.capturedAt);
      driverLocation = {
        latitude: rawLoc.latitude,
        longitude: rawLoc.longitude,
        accuracyMeters: rawLoc.accuracy,
        heading: rawLoc.heading,
        speed: rawLoc.speed,
        capturedAt: rawLoc.capturedAt,
        source: 'DRIVER_DEVICE',
        freshness,
      };
    }
  }

  const distances = computeTripDistances(
    driverLocation,
    pickupCoordinates,
    destinationCoordinates,
  );

  let etaToPickup: ETAResult | null = null;
  if (driverLocation) {
    try {
      etaToPickup = await defaultETAService.estimateETA({
        origin: { latitude: driverLocation.latitude, longitude: driverLocation.longitude },
        destination: pickupCoordinates,
        bookingId: booking.id,
        context: 'DRIVER_TO_PICKUP',
      });
    } catch {
      etaToPickup = null;
    }
  }

  let etaToDestination: ETAResult | null = null;
  if (destinationCoordinates && (driverLocation || pickupCoordinates)) {
    try {
      const origin = driverLocation
        ? { latitude: driverLocation.latitude, longitude: driverLocation.longitude }
        : pickupCoordinates;

      etaToDestination = await defaultETAService.estimateETA({
        origin,
        destination: destinationCoordinates,
        bookingId: booking.id,
        context: 'PICKUP_TO_DESTINATION',
      });
    } catch {
      etaToDestination = null;
    }
  }

  const pickupProximity = evaluatePickupProximity(driverLocation, pickupCoordinates);
  const destinationProximity = evaluateDestinationProximity(driverLocation, destinationCoordinates);
  const pickupZone = await evaluatePickupZoneIntelligence(
    pickupCoordinates.latitude,
    pickupCoordinates.longitude,
  );

  const locationConfidence = driverLocation
    ? assessLocationConfidence(driverLocation)
    : {
        level: 'UNAVAILABLE' as const,
        score: 0,
        factors: {
          timestampAgeSeconds: 999999,
          accuracyMeters: null,
          isCoordinatesValid: false,
          movementConsistent: false,
          telemetryAvailable: false,
        },
        explanation: 'Driver location unavailable',
      };

  return {
    bookingId: booking.id,
    status: booking.status,
    driverLocation,
    pickupCoordinates,
    destinationCoordinates,
    distances,
    etaToPickup,
    etaToDestination,
    pickupProximity,
    destinationProximity,
    pickupZone,
    locationConfidence,
    freshness: driverLocation?.freshness || 'UNAVAILABLE',
  };
}

export async function getDriverPickupLocationIntelligence(
  bookingId: string,
  db: Db = prisma,
) {
  const intel = await getBookingLocationIntelligence(bookingId, db);
  if (!intel) return null;

  const guidance = await generateDriverPickupGuidance(
    intel.driverLocation,
    intel.pickupCoordinates,
    intel.status,
    intel.etaToPickup,
  );

  return {
    ...intel,
    guidance,
  };
}

export async function getAdminLocationIntelligenceSummary(db: Db = prisma) {
  const telemetry = getLocationTelemetryStats();

  const totalCurrentDrivers = await db.driverCurrentLocation.count();
  const activeBookingsWithDriver = await db.booking.count({
    where: {
      status: { in: ['DRIVER_ASSIGNED', 'DRIVER_EN_ROUTE', 'TRIP_IN_PROGRESS'] },
      driverProfileId: { not: null },
    },
  });

  return {
    telemetry,
    totalCurrentDrivers,
    activeBookingsWithDriver,
    healthStatus: telemetry.etaFailureCount > 10 ? 'STRAINED' : 'HEALTHY',
    timestamp: new Date().toISOString(),
  };
}
