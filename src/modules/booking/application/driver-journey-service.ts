import 'server-only';
import { prisma, type Db } from '@/shared/database/prisma';
import { BookingStatus, DriverAvailabilityStatus } from '@prisma/client';
import { getOrCreateDriverProfile } from '@/modules/driver/application/services/driver-profile-service';
import { evaluateDriverEligibility } from '@/modules/driver/application/services/driver-eligibility-service';
import { addDriverToLiveIndex } from '@/modules/location/application/driver-location-service';
import { validateBookingStatusTransition } from '../domain/booking-state-machine';
import { insertOutboxEvent } from '@/shared/outbox/outbox-service';
import { recordAuditLog } from '@/shared/audit/audit-service';
import { realtime } from '@/shared/realtime/realtime-provider';
import { calculateFinalFare } from '@/modules/pricing/application/fare-calculation-service';
import { evaluateAndQualifyReferral } from '@/modules/identity/application/services/referral-service';
import { verifyPassword } from '@/modules/identity/security/password';
import { CustomerPinNotSetError } from '@/modules/customer/application/services/ride-pin-service';
import {
  BookingNotFoundError,
  InvalidRidePinError,
  MaxRidePinAttemptsExceededError,
} from '../domain/errors';

export interface DriverBookingSummary {
  id: string;
  customerId: string;
  status: BookingStatus;
  bookingType: string;
  pickupLocation: {
    latitude: number;
    longitude: number;
    address: string;
    label: string | null;
  };
  requestedStartTime: Date | null;
  estimatedDurationMinutes: number | null;
  customerNotes: string | null;
  assignedAt: Date | null;
  driverEnRouteAt: Date | null;
  driverArrivedAt: Date | null;
  tripStartedAt: Date | null;
  tripCompletedAt: Date | null;
  createdAt: Date;
}

export interface ActiveDriverLocationSnapshot {
  latitude: number;
  longitude: number;
  heading: number | null;
  speed: number | null;
  accuracy: number | null;
  capturedAt: Date;
}

/**
 * Validates driver ownership of the booking.
 */
async function getAuthorizedDriverBooking(
  driverUserId: string,
  bookingId: string,
  db: Db = prisma,
) {
  const profile = await getOrCreateDriverProfile(driverUserId, db);

  const booking = await db.booking.findUnique({
    where: { id: bookingId },
  });

  if (!booking) {
    throw new BookingNotFoundError(bookingId);
  }

  if (booking.driverProfileId !== profile.id) {
    throw new BookingNotFoundError(bookingId);
  }

  return { profile, booking };
}

/**
 * Driver marks status as EN_ROUTE towards pickup location.
 */
export async function startEnRoute(
  driverUserId: string,
  bookingId: string,
  db: Db = prisma,
): Promise<DriverBookingSummary> {
  const { profile, booking } = await getAuthorizedDriverBooking(driverUserId, bookingId, db);

  validateBookingStatusTransition(booking.status, BookingStatus.DRIVER_EN_ROUTE);

  const now = new Date();

  await db.$transaction(async (tx) => {
    await tx.booking.update({
      where: { id: booking.id },
      data: {
        status: BookingStatus.DRIVER_EN_ROUTE,
        driverEnRouteAt: now,
      },
    });

    await tx.bookingLog.create({
      data: {
        bookingId: booking.id,
        actorUserId: driverUserId,
        fromStatus: booking.status,
        toStatus: BookingStatus.DRIVER_EN_ROUTE,
        action: 'booking.driver.en_route',
        reason: 'Driver started journey to pickup location',
      },
    });

    await insertOutboxEvent(tx, {
      eventType: 'booking.driver.en_route',
      aggregateType: 'Booking',
      aggregateId: booking.id,
      payload: {
        bookingId: booking.id,
        driverProfileId: profile.id,
        enRouteAt: now.toISOString(),
      },
    });
  });

  await recordAuditLog(db, {
    actorUserId: driverUserId,
    action: 'booking.driver.en_route',
    entityType: 'Booking',
    entityId: bookingId,
    beforeState: { status: booking.status },
    afterState: { status: BookingStatus.DRIVER_EN_ROUTE },
  });

  realtime.publishBookingUpdate(bookingId, 'booking.driver.en_route', {
    bookingId,
    status: BookingStatus.DRIVER_EN_ROUTE,
    enRouteAt: now.toISOString(),
  });

  const updated = await db.booking.findUniqueOrThrow({ where: { id: booking.id } });
  return mapBookingToDriverSummary(updated);
}

/**
 * Driver marks status as ARRIVED at pickup location.
 */
export async function markArrived(
  driverUserId: string,
  bookingId: string,
  db: Db = prisma,
): Promise<DriverBookingSummary> {
  const { profile, booking } = await getAuthorizedDriverBooking(driverUserId, bookingId, db);

  validateBookingStatusTransition(booking.status, BookingStatus.DRIVER_ARRIVED);

  const now = new Date();

  await db.$transaction(async (tx) => {
    await tx.booking.update({
      where: { id: booking.id },
      data: {
        status: BookingStatus.DRIVER_ARRIVED,
        driverArrivedAt: now,
      },
    });

    await tx.bookingLog.create({
      data: {
        bookingId: booking.id,
        actorUserId: driverUserId,
        fromStatus: booking.status,
        toStatus: BookingStatus.DRIVER_ARRIVED,
        action: 'booking.driver.arrived',
        reason: 'Driver arrived at pickup location',
      },
    });

    await insertOutboxEvent(tx, {
      eventType: 'booking.driver.arrived',
      aggregateType: 'Booking',
      aggregateId: booking.id,
      payload: {
        bookingId: booking.id,
        driverProfileId: profile.id,
        arrivedAt: now.toISOString(),
      },
    });
  });

  await recordAuditLog(db, {
    actorUserId: driverUserId,
    action: 'booking.driver.arrived',
    entityType: 'Booking',
    entityId: bookingId,
    beforeState: { status: booking.status },
    afterState: { status: BookingStatus.DRIVER_ARRIVED },
  });

  realtime.publishBookingUpdate(bookingId, 'booking.driver.arrived', {
    bookingId,
    status: BookingStatus.DRIVER_ARRIVED,
    arrivedAt: now.toISOString(),
  });

  const updated = await db.booking.findUniqueOrThrow({ where: { id: booking.id } });
  return mapBookingToDriverSummary(updated);
}

/**
 * Driver starts the trip after verifying customer 6-digit Ride PIN.
 */
export async function startTrip(
  driverUserId: string,
  bookingId: string,
  ridePin: string,
  db: Db = prisma,
): Promise<DriverBookingSummary> {
  const { profile, booking } = await getAuthorizedDriverBooking(driverUserId, bookingId, db);

  validateBookingStatusTransition(booking.status, BookingStatus.TRIP_IN_PROGRESS);

  const MAX_ATTEMPTS = 5;
  if (booking.ridePinVerificationAttemptCount >= MAX_ATTEMPTS) {
    throw new MaxRidePinAttemptsExceededError();
  }

  const customerProfile = await db.customerProfile.findUnique({
    where: { userId: booking.customerId },
    select: { customerRidePinHash: true },
  });

  if (!customerProfile || !customerProfile.customerRidePinHash) {
    throw new CustomerPinNotSetError();
  }

  const isPinValid = await verifyPassword(ridePin, customerProfile.customerRidePinHash);

  if (!isPinValid) {
    const newAttemptCount = booking.ridePinVerificationAttemptCount + 1;
    await db.booking.update({
      where: { id: booking.id },
      data: { ridePinVerificationAttemptCount: newAttemptCount },
    });

    await recordAuditLog(db, {
      actorUserId: driverUserId,
      action: 'RIDE_PIN_VERIFICATION_FAILED',
      entityType: 'Booking',
      entityId: booking.id,
      beforeState: { attemptCount: booking.ridePinVerificationAttemptCount },
      afterState: { attemptCount: newAttemptCount },
      requestMetadata: null,
    });

    throw new InvalidRidePinError();
  }

  const now = new Date();

  await db.$transaction(async (tx) => {
    await tx.booking.update({
      where: { id: booking.id },
      data: {
        status: BookingStatus.TRIP_IN_PROGRESS,
        tripStartedAt: now,
        ridePinVerifiedAt: now,
        ridePinVerifiedByDriverId: profile.id,
        ridePinVerificationAttemptCount: 0,
      },
    });

    await tx.bookingLog.create({
      data: {
        bookingId: booking.id,
        actorUserId: driverUserId,
        fromStatus: booking.status,
        toStatus: BookingStatus.TRIP_IN_PROGRESS,
        action: 'booking.trip.started',
        reason: 'Driver verified Ride PIN and started trip',
      },
    });

    await insertOutboxEvent(tx, {
      eventType: 'booking.trip.started',
      aggregateType: 'Booking',
      aggregateId: booking.id,
      payload: {
        bookingId: booking.id,
        driverProfileId: profile.id,
        tripStartedAt: now.toISOString(),
        ridePinVerifiedAt: now.toISOString(),
      },
    });
  });

  await recordAuditLog(db, {
    actorUserId: driverUserId,
    action: 'RIDE_PIN_VERIFIED',
    entityType: 'Booking',
    entityId: bookingId,
    beforeState: { status: booking.status, verified: false },
    afterState: {
      status: BookingStatus.TRIP_IN_PROGRESS,
      verified: true,
      verifiedByDriverId: profile.id,
    },
    requestMetadata: null,
  });

  realtime.publishBookingUpdate(bookingId, 'booking.trip.started', {
    bookingId,
    status: BookingStatus.TRIP_IN_PROGRESS,
    tripStartedAt: now.toISOString(),
  });

  const updated = await db.booking.findUniqueOrThrow({ where: { id: booking.id } });
  return mapBookingToDriverSummary(updated);
}

/**
 * Driver completes the trip and handles post-trip driver availability restoration.
 */
export async function completeTrip(
  driverUserId: string,
  bookingId: string,
  db: Db = prisma,
): Promise<DriverBookingSummary> {
  const { profile, booking } = await getAuthorizedDriverBooking(driverUserId, bookingId, db);

  validateBookingStatusTransition(booking.status, BookingStatus.TRIP_COMPLETED);

  const now = new Date();

  // Calculate actual duration and final fare snapshot
  let actualDurationMinutes = booking.estimatedDurationMinutes ?? 15;
  if (booking.tripStartedAt) {
    const elapsedMs = now.getTime() - new Date(booking.tripStartedAt).getTime();
    actualDurationMinutes = Math.max(5, Math.ceil(elapsedMs / (1000 * 60)));
  }

  const finalFareResult = await calculateFinalFare(
    {
      bookingType: booking.bookingType,
      pickup: {
        latitude: booking.pickupLatitude,
        longitude: booking.pickupLongitude,
        address: booking.pickupAddress,
        label: booking.pickupLabel,
      },
      dropoff:
        booking.dropoffLatitude && booking.dropoffLongitude && booking.dropoffAddress
          ? {
              latitude: booking.dropoffLatitude,
              longitude: booking.dropoffLongitude,
              address: booking.dropoffAddress,
              label: booking.dropoffLabel,
            }
          : null,
      actualDurationMinutes,
      numberOfDays: booking.numberOfDays,
      hourlyPackageHours: booking.hourlyPackageHours,
    },
    db,
  );

  await db.$transaction(async (tx) => {
    await tx.booking.update({
      where: { id: booking.id },
      data: {
        status: BookingStatus.TRIP_COMPLETED,
        tripCompletedAt: now,
        finalFareAmount: finalFareResult.breakdown.totalFareAmount,
      },
    });

    // Restore driver availability status from BUSY to AVAILABLE
    if (profile.availabilityStatus === DriverAvailabilityStatus.BUSY) {
      await tx.driverProfile.update({
        where: { id: profile.id },
        data: { availabilityStatus: DriverAvailabilityStatus.AVAILABLE },
      });
    }

    await tx.bookingLog.create({
      data: {
        bookingId: booking.id,
        actorUserId: driverUserId,
        fromStatus: booking.status,
        toStatus: BookingStatus.TRIP_COMPLETED,
        action: 'booking.trip.completed',
        reason: 'Driver completed the trip',
      },
    });

    await insertOutboxEvent(tx, {
      eventType: 'booking.trip.completed',
      aggregateType: 'Booking',
      aggregateId: booking.id,
      payload: {
        bookingId: booking.id,
        driverProfileId: profile.id,
        finalFareAmount: finalFareResult.breakdown.totalFareAmount,
        tripCompletedAt: now.toISOString(),
      },
    });
  });

  // Evaluate & qualify customer referral milestone on first completed trip
  try {
    await evaluateAndQualifyReferral(
      {
        userId: booking.customerId,
        trigger: 'CUSTOMER_FIRST_TRIP',
      },
      db,
    );
  } catch {
    // Non-blocking milestone evaluation
  }

  // Re-index driver in Redis GEO set if driver is eligible & available
  const eligibility = await evaluateDriverEligibility(profile.id, db);
  if (eligibility.isEligible && profile.availabilityStatus !== DriverAvailabilityStatus.OFFLINE) {
    await addDriverToLiveIndex(profile.id, db);
  }

  await recordAuditLog(db, {
    actorUserId: driverUserId,
    action: 'booking.trip.completed',
    entityType: 'Booking',
    entityId: bookingId,
    beforeState: { status: booking.status },
    afterState: { status: BookingStatus.TRIP_COMPLETED },
  });

  realtime.publishBookingUpdate(bookingId, 'booking.trip.completed', {
    bookingId,
    status: BookingStatus.TRIP_COMPLETED,
    tripCompletedAt: now.toISOString(),
  });

  const updated = await db.booking.findUniqueOrThrow({ where: { id: booking.id } });
  return mapBookingToDriverSummary(updated);
}

/**
 * Lists assigned bookings for a driver.
 */
export async function listDriverBookings(
  driverUserId: string,
  db: Db = prisma,
): Promise<DriverBookingSummary[]> {
  const profile = await getOrCreateDriverProfile(driverUserId, db);

  const bookings = await db.booking.findMany({
    where: { driverProfileId: profile.id },
    orderBy: { createdAt: 'desc' },
    // Previously unbounded — caps a long-tenured driver's history query
    // without changing the flat-array response shape the driver bookings
    // page already expects.
    take: 200,
  });

  return bookings.map(mapBookingToDriverSummary);
}

/**
 * Securely fetches current live location of assigned driver for active booking tracking.
 * Restricted to booking customer owner and active booking lifecycle states.
 */
export async function getDriverLocationForBooking(
  customerUserId: string,
  bookingId: string,
  db: Db = prisma,
): Promise<ActiveDriverLocationSnapshot | null> {
  const booking = await db.booking.findUnique({
    where: { id: bookingId },
  });

  if (!booking) {
    throw new BookingNotFoundError(bookingId);
  }

  if (booking.customerId !== customerUserId) {
    throw new BookingNotFoundError(bookingId);
  }

  const activeStates: BookingStatus[] = [
    BookingStatus.DRIVER_ASSIGNED,
    BookingStatus.DRIVER_EN_ROUTE,
    BookingStatus.DRIVER_ARRIVED,
    BookingStatus.TRIP_IN_PROGRESS,
  ];

  if (!activeStates.includes(booking.status) || !booking.driverProfileId) {
    return null; // Restricted: No live location available outside active trip lifecycle
  }

  const location = await db.driverCurrentLocation.findUnique({
    where: { driverProfileId: booking.driverProfileId },
  });

  if (!location) return null;

  return {
    latitude: location.latitude,
    longitude: location.longitude,
    heading: location.heading,
    speed: location.speed,
    accuracy: location.accuracy,
    capturedAt: location.capturedAt,
  };
}

import type { Booking } from '@prisma/client';

function mapBookingToDriverSummary(booking: Booking): DriverBookingSummary {
  return {
    id: booking.id,
    customerId: booking.customerId,
    status: booking.status,
    bookingType: booking.bookingType,
    pickupLocation: {
      latitude: booking.pickupLatitude,
      longitude: booking.pickupLongitude,
      address: booking.pickupAddress,
      label: booking.pickupLabel,
    },
    requestedStartTime: booking.requestedStartTime,
    estimatedDurationMinutes: booking.estimatedDurationMinutes,
    customerNotes: booking.customerNotes,
    assignedAt: booking.assignedAt,
    driverEnRouteAt: booking.driverEnRouteAt,
    driverArrivedAt: booking.driverArrivedAt,
    tripStartedAt: booking.tripStartedAt,
    tripCompletedAt: booking.tripCompletedAt,
    createdAt: booking.createdAt,
  };
}
