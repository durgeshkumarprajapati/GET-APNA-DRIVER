import 'server-only';
import { prisma, type Db } from '@/shared/database/prisma';
import {
  BookingStatus,
  BookingType,
  DriverAvailabilityStatus,
  AssignmentAttemptStatus,
} from '@prisma/client';
import { getOrCreateDriverProfile } from '@/modules/driver/application/services/driver-profile-service';
import { evaluateDriverEligibility } from '@/modules/driver/application/services/driver-eligibility-service';
import { addDriverToLiveIndex } from '@/modules/location/application/driver-location-service';
import {
  validateBookingStatusTransition,
  isBookingCancellable,
} from '../domain/booking-state-machine';
import { getBoolean, getInteger } from '@/shared/config/configuration-service';
import { insertOutboxEvent } from '@/shared/outbox/outbox-service';
import { recordAuditLog } from '@/shared/audit/audit-service';
import { realtime } from '@/shared/realtime/realtime-provider';
import { calculateFinalFare } from '@/modules/pricing/application/fare-calculation-service';
import { autoRefundCapturedPaymentOnCancellation } from '@/modules/finance/application/services/refund-service';
import { evaluateAndQualifyReferral } from '@/modules/identity/application/services/referral-service';
import { evaluateDriverIncentivesForCompletedTrip } from '@/modules/incentive/application/services/incentive-evaluator-service';
import { evaluateCustomerLoyaltyForCompletedTrip } from '@/modules/loyalty/application/services/loyalty-evaluator-service';
import { verifyPassword } from '@/modules/identity/security/password';
import { CustomerPinNotSetError } from '@/modules/customer/application/services/ride-pin-service';
import { createNotification } from '@/modules/notification/application/notification-service';
import {
  BookingNotFoundError,
  BookingNotCancellableError,
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
 * Driver cancels a trip they were assigned to (before it starts) — the
 * driver-initiated counterpart to booking-service.ts's cancelBooking
 * (customer) and dispatch-service.ts's cancelBookingByOperator (admin).
 * Reuses the exact same cancellability policy as customer self-cancellation
 * (isBookingCancellable + the same booking.lifecycle.allow_*_cancellation_*
 * config flags) — there is no separate driver cancellation policy, by
 * design, so ops can't end up with three different cancellation windows
 * for the same trip depending on who cancels.
 */
export async function cancelBookingByDriver(
  driverUserId: string,
  bookingId: string,
  cancellationReason?: string,
  db: Db = prisma,
): Promise<DriverBookingSummary> {
  const { profile, booking } = await getAuthorizedDriverBooking(driverUserId, bookingId, db);

  const allowAfterAssignment = await getBoolean(
    'booking.lifecycle.allow_customer_cancellation_after_assignment',
    true,
    db,
  );
  const allowEnRoute = await getBoolean(
    'booking.lifecycle.allow_customer_cancellation_en_route',
    true,
    db,
  );
  const allowAfterArrival = await getBoolean(
    'booking.lifecycle.allow_customer_cancellation_after_arrival',
    false,
    db,
  );

  if (
    !isBookingCancellable(booking.status, {
      allowAfterAssignment,
      allowEnRoute,
      allowAfterArrival,
    })
  ) {
    throw new BookingNotCancellableError(bookingId, booking.status);
  }

  validateBookingStatusTransition(booking.status, BookingStatus.CANCELLED);

  const now = new Date();

  await db.$transaction(async (tx) => {
    await tx.booking.update({
      where: { id: booking.id },
      data: {
        status: BookingStatus.CANCELLED,
        cancelledAt: now,
        cancelledBy: driverUserId,
        cancellationReason: cancellationReason || 'Cancelled by driver',
        driverProfileId: null,
      },
    });

    await tx.bookingAssignmentAttempt.updateMany({
      where: { bookingId: booking.id, status: AssignmentAttemptStatus.PENDING },
      data: { status: AssignmentAttemptStatus.CANCELLED },
    });

    await tx.driverProfile.update({
      where: { id: profile.id },
      data: { availabilityStatus: DriverAvailabilityStatus.AVAILABLE },
    });

    await tx.bookingLog.create({
      data: {
        bookingId: booking.id,
        actorUserId: driverUserId,
        fromStatus: booking.status,
        toStatus: BookingStatus.CANCELLED,
        action: 'booking.driver.cancelled',
        reason: cancellationReason || 'Cancelled by driver',
      },
    });

    await insertOutboxEvent(tx, {
      eventType: 'booking.driver.cancelled',
      aggregateType: 'Booking',
      aggregateId: booking.id,
      payload: {
        bookingId: booking.id,
        customerId: booking.customerId,
        driverProfileId: profile.id,
        cancelledAt: now.toISOString(),
        reason: cancellationReason,
      },
    });
  });

  const eligibility = await evaluateDriverEligibility(profile.id, db);
  if (eligibility.isEligible) {
    await addDriverToLiveIndex(profile.id, db);
  }

  await recordAuditLog(db, {
    actorUserId: driverUserId,
    action: 'booking.driver.cancelled',
    entityType: 'Booking',
    entityId: bookingId,
    beforeState: { status: booking.status },
    afterState: { status: BookingStatus.CANCELLED, cancellationReason },
  });

  realtime.publishBookingUpdate(bookingId, 'booking.driver.cancelled', {
    bookingId,
    status: BookingStatus.CANCELLED,
    cancelledBy: driverUserId,
  });

  // Let the customer know their driver — not them — cancelled, distinct
  // from the copy self-cancellation would show them.
  await createNotification({
    userId: booking.customerId,
    category: 'BOOKING',
    type: 'BOOKING_CANCELLED',
    title: 'Trip Cancelled by Driver',
    body: 'Your driver had to cancel this trip. We are sorry for the inconvenience — please book again to find another driver.',
    data: { bookingId },
  });

  // Automatic refund if booking was paid prior to driver cancellation —
  // shared with the customer-cancel and admin/operator-cancel paths (see
  // refund-service.ts) so all three apply the exact same refund policy.
  await autoRefundCapturedPaymentOnCancellation(
    {
      bookingId,
      customerId: booking.customerId,
      actorUserId: driverUserId,
      cancellationReason,
      defaultReason: 'Automatic refund for driver-cancelled booking',
    },
    db,
  );

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
 * These are the only two BookingType values priced by real distance/duration
 * (see pricing-rules.ts's `calculateFareBreakdown` switch — every other
 * type is either explicitly package-priced or ROUND_TRIP's fixed distance
 * multiplier). A pickup-only trip of one of these types has no dropoff to
 * measure real distance from, which would otherwise silently bill only the
 * base fare + elapsed-time component (then the minimum-fare floor).
 */
const DISTANCE_PRICED_BOOKING_TYPES: BookingType[] = [
  BookingType.POINT_TO_POINT,
  BookingType.ONE_WAY,
];

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

  let effectiveDropoff =
    booking.dropoffLatitude && booking.dropoffLongitude && booking.dropoffAddress
      ? {
          latitude: booking.dropoffLatitude,
          longitude: booking.dropoffLongitude,
          address: booking.dropoffAddress,
          label: booking.dropoffLabel,
        }
      : null;

  // Pickup-only trip (no dropoff was ever captured) on a distance-priced
  // booking type: the deterministic route provider would otherwise report
  // 0km, silently billing only base fare + elapsed time (then the minimum-
  // fare floor). Use the driver's own live GPS ping as a server-authoritative
  // stand-in for where the trip actually ended, so distance is billed for
  // real — same freshness discipline as trip-reliability's stale-location
  // rule, just a separate config key since this is the pricing module.
  let capturedCompletionDropoff: typeof effectiveDropoff = null;
  if (!effectiveDropoff && DISTANCE_PRICED_BOOKING_TYPES.includes(booking.bookingType)) {
    const maxAgeSeconds = await getInteger(
      'pricing.pickup_only_completion_location_max_age_seconds',
      300,
      db,
    );
    const liveLocation = await db.driverCurrentLocation?.findUnique?.({
      where: { driverProfileId: profile.id },
    });
    if (liveLocation) {
      const ageSeconds = (now.getTime() - new Date(liveLocation.capturedAt).getTime()) / 1000;
      if (ageSeconds <= maxAgeSeconds) {
        capturedCompletionDropoff = {
          latitude: liveLocation.latitude,
          longitude: liveLocation.longitude,
          address: 'Trip end location (auto-captured from driver GPS)',
          label: null,
        };
        effectiveDropoff = capturedCompletionDropoff;
      }
    }
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
      dropoff: effectiveDropoff,
      actualDurationMinutes,
      numberOfDays: booking.numberOfDays,
      hourlyPackageHours: booking.hourlyPackageHours,
      // The frozen rate the customer agreed to at booking creation (DAILY/
      // WEEKLY/MONTHLY hires with a selected driver) — reused unchanged
      // here so the final charge never reverts to the platform-default
      // rate just because it was recomputed at trip completion.
      driverCustomRate: booking.driverCustomRateSnapshot
        ? booking.driverCustomRateSnapshot.toString()
        : null,
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
        ...(capturedCompletionDropoff
          ? {
              dropoffLatitude: capturedCompletionDropoff.latitude,
              dropoffLongitude: capturedCompletionDropoff.longitude,
              dropoffAddress: capturedCompletionDropoff.address,
            }
          : {}),
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
        // customerId/driverUserId are what the notification handler for
        // this event actually keys its `if (customerId)`/`if (driverUserId)`
        // checks on — without them, neither notification (including the
        // customer's "please rate your driver" prompt) was ever created,
        // even though the handler code for it already existed.
        customerId: booking.customerId,
        driverUserId,
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

  // Evaluate active driver incentive campaigns for completed trip
  try {
    await evaluateDriverIncentivesForCompletedTrip(
      {
        driverProfileId: profile.id,
        bookingId: booking.id,
        fareAmount: finalFareResult.breakdown.totalFareAmount,
        completedAt: now,
      },
      db,
    );
  } catch {
    // Non-blocking incentive evaluation
  }

  // Evaluate customer loyalty points & tier progress for completed trip
  try {
    await evaluateCustomerLoyaltyForCompletedTrip(
      {
        customerId: booking.customerId,
        bookingId: booking.id,
        fareAmount: finalFareResult.breakdown.totalFareAmount,
        completedAt: now,
      },
      db,
    );
  } catch {
    // Non-blocking loyalty evaluation
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
