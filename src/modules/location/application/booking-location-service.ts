import { BookingStatus } from '@prisma/client';
import { type Db } from '@/shared/database/prisma';
import { prisma } from '@/shared/database/prisma';
import { BookingNotFoundError } from '@/modules/booking/domain/errors';

export interface LocationCoordinates {
  latitude: number;
  longitude: number;
  address?: string | null;
  label?: string | null;
}

export interface DriverTelemetryLocation {
  latitude: number;
  longitude: number;
  heading: number | null;
  speed: number | null;
  accuracy: number | null;
  capturedAt: Date | string;
}

export interface CustomerBookingLocationTelemetry {
  bookingId: string;
  status: BookingStatus;
  pickupLocation: LocationCoordinates;
  dropoffLocation: LocationCoordinates | null;
  driverLocation: DriverTelemetryLocation | null;
  assignedDriver: {
    id: string;
    displayName: string | null;
    profileImageUrl: string | null;
  } | null;
}

export interface DriverBookingLocationTelemetry {
  bookingId: string;
  status: BookingStatus;
  pickupLocation: LocationCoordinates;
  dropoffLocation: LocationCoordinates | null;
  driverLocation: DriverTelemetryLocation | null;
}

const ACTIVE_TRACKING_STATUSES: BookingStatus[] = [
  'DRIVER_ASSIGNED',
  'DRIVER_EN_ROUTE',
  'DRIVER_ARRIVED',
  'TRIP_IN_PROGRESS',
] as BookingStatus[];

/**
 * Authoritatively retrieves customer booking location telemetry with IDOR protection.
 * Only the customer who owns the booking may access driver telemetry during active tracking states.
 */
export async function getCustomerBookingLocationTelemetry(
  customerUserId: string,
  bookingId: string,
  db: Db = prisma,
): Promise<CustomerBookingLocationTelemetry> {
  const booking = await db.booking.findUnique({
    where: { id: bookingId },
    include: {
      driverProfile: {
        select: {
          id: true,
          displayName: true,
          profileImageUrl: true,
        },
      },
    },
  });

  if (!booking || booking.customerId !== customerUserId) {
    throw new BookingNotFoundError(bookingId);
  }

  let driverLocation: DriverTelemetryLocation | null = null;

  if (ACTIVE_TRACKING_STATUSES.includes(booking.status) && booking.driverProfileId) {
    const liveLoc = await db.driverCurrentLocation.findUnique({
      where: { driverProfileId: booking.driverProfileId },
    });

    if (liveLoc) {
      driverLocation = {
        latitude: liveLoc.latitude,
        longitude: liveLoc.longitude,
        heading: liveLoc.heading,
        speed: liveLoc.speed,
        accuracy: liveLoc.accuracy,
        capturedAt: liveLoc.capturedAt,
      };
    }
  }

  const assignedDriver = booking.driverProfile
    ? {
        id: booking.driverProfile.id,
        displayName: booking.driverProfile.displayName ?? null,
        profileImageUrl: booking.driverProfile.profileImageUrl ?? null,
      }
    : null;

  return {
    bookingId: booking.id,
    status: booking.status,
    pickupLocation: {
      latitude: booking.pickupLatitude,
      longitude: booking.pickupLongitude,
      address: booking.pickupAddress,
      label: booking.pickupLabel,
    },
    dropoffLocation:
      booking.dropoffLatitude && booking.dropoffLongitude
        ? {
            latitude: booking.dropoffLatitude,
            longitude: booking.dropoffLongitude,
            address: booking.dropoffAddress,
            label: booking.dropoffLabel,
          }
        : null,
    driverLocation,
    assignedDriver,
  };
}

/**
 * Authoritatively retrieves driver pickup/dropoff location telemetry with IDOR protection.
 * Restricted to assigned drivers or drivers holding an active assignment offer.
 */
export async function getDriverBookingLocationTelemetry(
  driverUserId: string,
  bookingId: string,
  db: Db = prisma,
): Promise<DriverBookingLocationTelemetry> {
  const driverProfile = await db.driverProfile.findUnique({
    where: { userId: driverUserId },
  });

  if (!driverProfile) {
    throw new BookingNotFoundError(bookingId);
  }

  const booking = await db.booking.findUnique({
    where: { id: bookingId },
  });

  if (!booking) {
    throw new BookingNotFoundError(bookingId);
  }

  // Verify driver assignment or active assignment offer
  const isAssignedDriver = booking.driverProfileId === driverProfile.id;

  let hasActiveOffer = false;
  if (!isAssignedDriver) {
    const offer = await db.bookingAssignmentAttempt.findFirst({
      where: {
        bookingId: booking.id,
        driverProfileId: driverProfile.id,
        status: 'PENDING',
        expiresAt: { gt: new Date() },
      },
    });
    hasActiveOffer = Boolean(offer);
  }

  if (!isAssignedDriver && !hasActiveOffer) {
    throw new BookingNotFoundError(bookingId);
  }

  let driverLocation: DriverTelemetryLocation | null = null;
  const liveLoc = await db.driverCurrentLocation.findUnique({
    where: { driverProfileId: driverProfile.id },
  });

  if (liveLoc) {
    driverLocation = {
      latitude: liveLoc.latitude,
      longitude: liveLoc.longitude,
      heading: liveLoc.heading,
      speed: liveLoc.speed,
      accuracy: liveLoc.accuracy,
      capturedAt: liveLoc.capturedAt,
    };
  }

  return {
    bookingId: booking.id,
    status: booking.status,
    pickupLocation: {
      latitude: booking.pickupLatitude,
      longitude: booking.pickupLongitude,
      address: booking.pickupAddress,
      label: booking.pickupLabel,
    },
    dropoffLocation:
      booking.dropoffLatitude && booking.dropoffLongitude
        ? {
            latitude: booking.dropoffLatitude,
            longitude: booking.dropoffLongitude,
            address: booking.dropoffAddress,
            label: booking.dropoffLabel,
          }
        : null,
    driverLocation,
  };
}
