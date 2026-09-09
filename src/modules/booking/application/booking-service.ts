import 'server-only';
import { prisma, type Db } from '@/shared/database/prisma';
import {
  BookingStatus,
  BookingType,
  AssignmentAttemptStatus,
  DriverAvailabilityStatus,
  type Prisma,
} from '@prisma/client';
import { validateCoordinates } from '@/modules/location/application/distance-service';
import { getInteger, getBoolean } from '@/shared/config/configuration-service';
import {
  isBookingCancellable,
  validateBookingStatusTransition,
} from '../domain/booking-state-machine';
import { findAndOfferNextDriver } from './matching-service';
import { addDriverToLiveIndex } from '@/modules/location/application/driver-location-service';
import { evaluateDriverEligibility } from '@/modules/driver/application/services/driver-eligibility-service';
import { insertOutboxEvent } from '@/shared/outbox/outbox-service';
import { recordAuditLog } from '@/shared/audit/audit-service';
import { realtime } from '@/shared/realtime/realtime-provider';
import { CreateBookingInput } from '../domain/types';
import {
  BookingNotFoundError,
  BookingNotCancellableError,
  DuplicateBookingIdempotencyError,
} from '../domain/errors';

import { calculateEstimatedFare } from '@/modules/pricing/application/fare-calculation-service';
import {
  createPricingQuoteSnapshot,
  toPrismaJson,
} from '@/modules/pricing/application/pricing-quote-service';

const MAX_CUSTOMER_BOOKINGS_RETURNED = 200;

export interface BookingDetail {
  id: string;
  idempotencyKey: string | null;
  customerId: string;
  driverProfileId: string | null;
  status: BookingStatus;
  bookingType: BookingType;
  pickupLocation: {
    latitude: number;
    longitude: number;
    address: string;
    label: string | null;
  };
  dropoffLocation?: {
    latitude: number;
    longitude: number;
    address: string;
    label: string | null;
  } | null;
  numberOfDays?: number | null;
  hourlyPackageHours?: number | null;
  returnDate?: Date | null;
  estimatedDistanceKm?: number | null;
  estimatedFareAmount?: string | null;
  finalFareAmount?: string | null;
  pricingSnapshot?: Prisma.JsonValue;
  routeEstimateSnapshot?: Prisma.JsonValue;
  requestedStartTime: Date | null;
  estimatedDurationMinutes: number | null;
  customerNotes: string | null;
  requestedAt: Date;
  searchStartedAt: Date | null;
  assignedAt: Date | null;
  cancelledAt: Date | null;
  cancellationReason: string | null;
  expiresAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  assignedDriver?: {
    id: string;
    displayName: string | null;
    profileImageUrl: string | null;
    primaryServiceArea: string | null;
    drivingExperienceYears: number;
  } | null;
}

/**
 * Creates a new customer booking with pickup/dropoff location snapshots, fare calculation,
 * server-side idempotency, and automated driver matching.
 */
export async function createBooking(
  customerUserId: string,
  input: CreateBookingInput,
  idempotencyKey?: string | null,
  db: Db = prisma,
): Promise<BookingDetail> {
  // 1. Idempotency Check
  if (idempotencyKey) {
    const existing = await db.booking.findUnique({
      where: { idempotencyKey },
      include: { driverProfile: true },
    });
    if (existing) {
      if (existing.customerId !== customerUserId) {
        throw new DuplicateBookingIdempotencyError(idempotencyKey);
      }
      return mapBookingToDetail(existing);
    }
  }

  // 2. Validate Coordinates
  validateCoordinates(input.pickupLocation.latitude, input.pickupLocation.longitude);
  if (input.dropoffLocation) {
    validateCoordinates(input.dropoffLocation.latitude, input.dropoffLocation.longitude);
  }

  // 3. Calculate Estimated Fare and Route
  const bookingType = input.bookingType || BookingType.ONE_WAY;
  const fareResult = await calculateEstimatedFare(
    {
      bookingType,
      pickup: input.pickupLocation,
      dropoff: input.dropoffLocation,
      estimatedDurationMinutes: input.estimatedDurationMinutes,
      numberOfDays: input.numberOfDays,
      hourlyPackageHours: input.hourlyPackageHours,
    },
    db,
  );

  const pricingSnapshot = createPricingQuoteSnapshot(bookingType, fareResult);

  const searchTimeoutSeconds = await getInteger('booking.matching.search_timeout_seconds', 300, db);
  const now = new Date();
  const searchExpiresAt = new Date(now.getTime() + searchTimeoutSeconds * 1000);

  // 4. Create Booking Record Transactionally
  const booking = await db.$transaction(async (tx) => {
    const created = await tx.booking.create({
      data: {
        idempotencyKey: idempotencyKey || null,
        customerId: customerUserId,
        status: BookingStatus.SEARCHING_DRIVER,
        bookingType,
        pickupLatitude: input.pickupLocation.latitude,
        pickupLongitude: input.pickupLocation.longitude,
        pickupAddress: input.pickupLocation.address,
        pickupLabel: input.pickupLocation.label || null,
        dropoffLatitude: input.dropoffLocation?.latitude ?? null,
        dropoffLongitude: input.dropoffLocation?.longitude ?? null,
        dropoffAddress: input.dropoffLocation?.address ?? null,
        dropoffLabel: input.dropoffLocation?.label ?? null,
        numberOfDays: input.numberOfDays ?? null,
        hourlyPackageHours: input.hourlyPackageHours ?? null,
        returnDate: input.returnDate ? new Date(input.returnDate) : null,
        estimatedDistanceKm: fareResult.estimatedDistanceKm,
        estimatedFareAmount: fareResult.breakdown.totalFareAmount,
        pricingSnapshot: toPrismaJson(pricingSnapshot),
        routeEstimateSnapshot: toPrismaJson(pricingSnapshot),
        requestedStartTime: input.requestedStartTime ? new Date(input.requestedStartTime) : null,
        estimatedDurationMinutes: fareResult.estimatedDurationMinutes,
        customerNotes: input.customerNotes || null,
        requestedAt: now,
        searchStartedAt: now,
        expiresAt: searchExpiresAt,
      },
    });

    await tx.bookingLog.create({
      data: {
        bookingId: created.id,
        actorUserId: customerUserId,
        fromStatus: BookingStatus.DRAFT,
        toStatus: BookingStatus.SEARCHING_DRIVER,
        action: 'booking.created',
        reason: 'Customer initiated booking creation',
      },
    });

    await insertOutboxEvent(tx, {
      eventType: 'booking.created',
      aggregateType: 'Booking',
      aggregateId: created.id,
      payload: {
        bookingId: created.id,
        customerId: customerUserId,
        status: BookingStatus.SEARCHING_DRIVER,
        pickupLatitude: created.pickupLatitude,
        pickupLongitude: created.pickupLongitude,
        estimatedFareAmount: fareResult.breakdown.totalFareAmount,
        createdAt: now.toISOString(),
      },
    });

    return created;
  });

  await recordAuditLog(db, {
    actorUserId: customerUserId,
    action: 'booking.created',
    entityType: 'Booking',
    entityId: booking.id,
    afterState: {
      customerId: customerUserId,
      status: BookingStatus.SEARCHING_DRIVER,
      idempotencyKey,
    },
  });

  // 4. Trigger driver matching
  try {
    await findAndOfferNextDriver(booking.id, db);
  } catch {
    // Matching errors handled asynchronously/safely
  }

  const freshBooking = await db.booking.findUniqueOrThrow({
    where: { id: booking.id },
    include: { driverProfile: true },
  });

  return mapBookingToDetail(freshBooking);
}

/**
 * Fetches a single booking detail with ownership authorization validation.
 * BOOKINGS_READ is granted broadly to both CUSTOMER and DRIVER roles, so the
 * permission check alone does not scope access to the caller's own
 * booking — this function must (and does) additionally verify the caller is
 * either the booking's customer or its assigned driver. Not-found (rather
 * than forbidden) is thrown for a non-owner to avoid leaking booking
 * existence, matching the pattern used elsewhere (e.g. review-service.ts).
 */
export async function getBookingById(
  userId: string,
  bookingId: string,
  db: Db = prisma,
): Promise<BookingDetail> {
  const booking = await db.booking.findUnique({
    where: { id: bookingId },
    include: { driverProfile: true },
  });

  if (!booking) {
    throw new BookingNotFoundError(bookingId);
  }

  const isOwnerCustomer = booking.customerId === userId;
  const isAssignedDriver = booking.driverProfile?.userId === userId;
  if (!isOwnerCustomer && !isAssignedDriver) {
    throw new BookingNotFoundError(bookingId);
  }

  return mapBookingToDetail(booking);
}

/**
 * Lists all active and past bookings for a customer, most recent first.
 * Capped at MAX_CUSTOMER_BOOKINGS_RETURNED — was previously fully
 * unbounded, growing without limit as a long-lived customer accumulates
 * bookings. A hard cap (rather than a page/pageSize response-shape change)
 * keeps this backward-compatible with the existing `/bookings` list page,
 * which expects a flat array.
 */
export async function listCustomerBookings(
  customerUserId: string,
  db: Db = prisma,
): Promise<BookingDetail[]> {
  const bookings = await db.booking.findMany({
    where: { customerId: customerUserId },
    include: { driverProfile: true },
    orderBy: { createdAt: 'desc' },
    take: MAX_CUSTOMER_BOOKINGS_RETURNED,
  });

  return bookings.map(mapBookingToDetail);
}

/**
 * Cancels a booking. Server-authoritative cancellation rule enforcement.
 * Customer-initiated cancellation only — the caller must own the booking.
 * (Operator-initiated cancellation of any booking is a separate, audited
 * flow: dispatch-service.ts's cancelBookingByOperator.)
 */
export async function cancelBooking(
  userId: string,
  bookingId: string,
  cancellationReason?: string,
  db: Db = prisma,
): Promise<BookingDetail> {
  const booking = await db.booking.findUnique({
    where: { id: bookingId },
    include: { driverProfile: true },
  });

  if (booking && booking.customerId !== userId) {
    throw new BookingNotFoundError(bookingId);
  }

  if (!booking) {
    throw new BookingNotFoundError(bookingId);
  }

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
  const assignedDriverId = booking.driverProfileId;

  await db.$transaction(async (tx) => {
    // Update booking status to CANCELLED
    await tx.booking.update({
      where: { id: booking.id },
      data: {
        status: BookingStatus.CANCELLED,
        cancelledAt: now,
        cancelledBy: userId,
        cancellationReason: cancellationReason || 'Cancelled by customer',
      },
    });

    // Mark active pending assignment attempts as CANCELLED
    await tx.bookingAssignmentAttempt.updateMany({
      where: { bookingId: booking.id, status: AssignmentAttemptStatus.PENDING },
      data: { status: AssignmentAttemptStatus.CANCELLED },
    });

    // Append Booking Log
    await tx.bookingLog.create({
      data: {
        bookingId: booking.id,
        actorUserId: userId,
        fromStatus: booking.status,
        toStatus: BookingStatus.CANCELLED,
        action: 'booking.cancelled',
        reason: cancellationReason || 'Cancelled by customer',
      },
    });

    // If driver was previously assigned, restore driver availability to AVAILABLE
    if (assignedDriverId) {
      await tx.driverProfile.update({
        where: { id: assignedDriverId },
        data: { availabilityStatus: DriverAvailabilityStatus.AVAILABLE },
      });
    }

    // Outbox Event
    await insertOutboxEvent(tx, {
      eventType: 'booking.cancelled',
      aggregateType: 'Booking',
      aggregateId: booking.id,
      payload: {
        bookingId: booking.id,
        cancelledBy: userId,
        reason: cancellationReason,
        cancelledAt: now.toISOString(),
      },
    });
  });

  // Re-index assigned driver in Redis GEO if driver is eligible & available
  if (assignedDriverId) {
    const eligibility = await evaluateDriverEligibility(assignedDriverId, db);
    if (eligibility.isEligible) {
      await addDriverToLiveIndex(assignedDriverId, db);
    }
  }

  await recordAuditLog(db, {
    actorUserId: userId,
    action: 'booking.cancelled',
    entityType: 'Booking',
    entityId: bookingId,
    beforeState: { status: booking.status },
    afterState: { status: BookingStatus.CANCELLED, cancellationReason },
  });

  realtime.publishBookingUpdate(bookingId, 'booking.cancelled', {
    bookingId,
    status: BookingStatus.CANCELLED,
    cancelledBy: userId,
  });

  const updatedBooking = await db.booking.findUniqueOrThrow({
    where: { id: booking.id },
    include: { driverProfile: true },
  });

  return mapBookingToDetail(updatedBooking);
}

function mapBookingToDetail(
  booking: Prisma.BookingGetPayload<{ include: { driverProfile: true } }>,
): BookingDetail {
  return {
    id: booking.id,
    idempotencyKey: booking.idempotencyKey,
    customerId: booking.customerId,
    driverProfileId: booking.driverProfileId,
    status: booking.status,
    bookingType: booking.bookingType,
    pickupLocation: {
      latitude: booking.pickupLatitude,
      longitude: booking.pickupLongitude,
      address: booking.pickupAddress,
      label: booking.pickupLabel,
    },
    dropoffLocation:
      booking.dropoffLatitude !== null &&
      booking.dropoffLongitude !== null &&
      booking.dropoffAddress
        ? {
            latitude: booking.dropoffLatitude,
            longitude: booking.dropoffLongitude,
            address: booking.dropoffAddress,
            label: booking.dropoffLabel,
          }
        : null,
    numberOfDays: booking.numberOfDays,
    hourlyPackageHours: booking.hourlyPackageHours,
    returnDate: booking.returnDate,
    estimatedDistanceKm: booking.estimatedDistanceKm,
    estimatedFareAmount: booking.estimatedFareAmount
      ? booking.estimatedFareAmount.toString()
      : null,
    finalFareAmount: booking.finalFareAmount ? booking.finalFareAmount.toString() : null,
    pricingSnapshot: booking.pricingSnapshot,
    routeEstimateSnapshot: booking.routeEstimateSnapshot,
    requestedStartTime: booking.requestedStartTime,
    estimatedDurationMinutes: booking.estimatedDurationMinutes,
    customerNotes: booking.customerNotes,
    requestedAt: booking.requestedAt,
    searchStartedAt: booking.searchStartedAt,
    assignedAt: booking.assignedAt,
    cancelledAt: booking.cancelledAt,
    cancellationReason: booking.cancellationReason,
    expiresAt: booking.expiresAt,
    createdAt: booking.createdAt,
    updatedAt: booking.updatedAt,
    assignedDriver: booking.driverProfile
      ? {
          id: booking.driverProfile.id,
          displayName: booking.driverProfile.displayName,
          profileImageUrl: booking.driverProfile.profileImageUrl,
          primaryServiceArea: booking.driverProfile.primaryServiceArea,
          drivingExperienceYears: booking.driverProfile.drivingExperienceYears,
        }
      : null,
  };
}
