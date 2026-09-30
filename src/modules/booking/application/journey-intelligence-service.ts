import { BookingStatus } from '@prisma/client';

export interface JourneyIntelligenceResult {
  headline: string;
  subtext: string;
  statusSignal: 'SEARCHING' | 'ASSIGNED' | 'EN_ROUTE' | 'APPROACHING' | 'ARRIVED' | 'TRIP_STARTED' | 'COMPLETED' | 'CANCELLED' | 'DELAYED';
  locationFreshness: 'FRESH' | 'STALE' | 'UNKNOWN';
  etaMinutes: number | null;
  distanceKm: number | null;
  serverTimestamp: string;
}

const LOCATION_FRESHNESS_THRESHOLD_MS = 30000; // 30 seconds

export function evaluateJourneyIntelligence(input: {
  bookingStatus: BookingStatus;
  driverLocationUpdatedAt?: Date | string | null;
  etaMinutes?: number | null;
  distanceKm?: number | null;
}): JourneyIntelligenceResult {
  const { bookingStatus, driverLocationUpdatedAt, etaMinutes = null, distanceKm = null } = input;
  const now = Date.now();

  let locationFreshness: 'FRESH' | 'STALE' | 'UNKNOWN' = 'UNKNOWN';
  if (driverLocationUpdatedAt) {
    const updatedMs = new Date(driverLocationUpdatedAt).getTime();
    locationFreshness = now - updatedMs <= LOCATION_FRESHNESS_THRESHOLD_MS ? 'FRESH' : 'STALE';
  }

  const serverTimestamp = new Date().toISOString();

  switch (bookingStatus) {
    case BookingStatus.SEARCHING_DRIVER:
      return {
        headline: 'Matching a top-rated driver',
        subtext: 'Searching nearby active drivers for your pickup location.',
        statusSignal: 'SEARCHING',
        locationFreshness,
        etaMinutes: null,
        distanceKm: null,
        serverTimestamp,
      };

    case BookingStatus.DRIVER_ASSIGNED:
      return {
        headline: 'Driver assigned',
        subtext: 'Your driver is assigned and preparing to navigate.',
        statusSignal: 'ASSIGNED',
        locationFreshness,
        etaMinutes,
        distanceKm,
        serverTimestamp,
      };

    case BookingStatus.DRIVER_EN_ROUTE: {
      const isApproaching =
        (distanceKm !== null && distanceKm <= 0.5) || (etaMinutes !== null && etaMinutes <= 3);
      const isDelayed = etaMinutes !== null && etaMinutes > 15;

      if (isApproaching) {
        return {
          headline: 'Your driver is approaching',
          subtext: locationFreshness === 'STALE' ? 'Location updating...' : 'Driver is within 500m of your pickup point.',
          statusSignal: 'APPROACHING',
          locationFreshness,
          etaMinutes,
          distanceKm,
          serverTimestamp,
        };
      }

      if (isDelayed) {
        return {
          headline: 'Arrival is taking longer than expected',
          subtext: 'Navigating through traffic. Thank you for your patience.',
          statusSignal: 'DELAYED',
          locationFreshness,
          etaMinutes,
          distanceKm,
          serverTimestamp,
        };
      }

      return {
        headline: 'Your driver is on the way',
        subtext:
          locationFreshness === 'STALE'
            ? 'Location updating...'
            : etaMinutes
              ? `Estimated arrival in ${etaMinutes} mins`
              : 'Navigating to pickup location',
        statusSignal: 'EN_ROUTE',
        locationFreshness,
        etaMinutes,
        distanceKm,
        serverTimestamp,
      };
    }

    case BookingStatus.DRIVER_ARRIVED:
      return {
        headline: 'Your driver has arrived',
        subtext: 'Your driver is waiting at the pickup location.',
        statusSignal: 'ARRIVED',
        locationFreshness,
        etaMinutes: 0,
        distanceKm: 0,
        serverTimestamp,
      };

    case BookingStatus.TRIP_IN_PROGRESS:
      return {
        headline: 'Your driver service has started',
        subtext: 'Have a safe and comfortable journey!',
        statusSignal: 'TRIP_STARTED',
        locationFreshness,
        etaMinutes: null,
        distanceKm: null,
        serverTimestamp,
      };

    case BookingStatus.TRIP_COMPLETED:
      return {
        headline: 'Journey completed',
        subtext: 'Thank you for choosing Get Apna Driver!',
        statusSignal: 'COMPLETED',
        locationFreshness,
        etaMinutes: 0,
        distanceKm: 0,
        serverTimestamp,
      };

    case BookingStatus.CANCELLED:
      return {
        headline: 'Booking cancelled',
        subtext: 'This driver service booking has been cancelled.',
        statusSignal: 'CANCELLED',
        locationFreshness,
        etaMinutes: null,
        distanceKm: null,
        serverTimestamp,
      };

    default:
      return {
        headline: 'Driver Service',
        subtext: 'Updating trip status...',
        statusSignal: 'EN_ROUTE',
        locationFreshness,
        etaMinutes,
        distanceKm,
        serverTimestamp,
      };
  }
}
