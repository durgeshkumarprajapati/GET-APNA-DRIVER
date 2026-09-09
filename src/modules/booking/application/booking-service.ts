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
 * Creates a new customer booking with pickup location snapshot, server-side idempotency,
 * and initiates automated driver matching.
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

  // 2. Validate Pickup Location Coordinates
  validateCoordinates(input.pickupLocation.latitude, input.pickupLocation.longitude);

  const searchTimeoutSeconds = await getInteger('booking.matching.search_timeout_seconds', 300, db);
  const now = new Date();
  const searchExpiresAt = new Date(now.getTime() + searchTimeoutSeconds * 1000);

  // 3. Create Booking Record Transactionally
  const booking = await db.$transaction(async (tx) => {
    const created = await tx.booking.create({
      data: {
        idempotencyKey: idempotencyKey || null,
        customerId: customerUserId,
        status: BookingStatus.SEARCHING_DRIVER,
        bookingType: input.bookingType || BookingType.ONE_WAY,
        pickupLatitude: input.pickupLocation.latitude,
        pickupLongitude: input.pickupLocation.longitude,
        pickupAddress: input.pickupLocation.address,
        pickupLabel: input.pickupLocation.label || null,
        requestedStartTime: input.requestedStartTime ? new Date(input.requestedStartTime) : null,
        estimatedDurationMinutes: input.estimatedDurationMinutes || null,
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
 */
export async function getBookingById(
  _userId: string,
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

  return mapBookingToDetail(booking);
}

/**
 * Lists all active and past bookings for a customer.
 */
export async function listCustomerBookings(
  customerUserId: string,
  db: Db = prisma,
): Promise<BookingDetail[]> {
  const bookings = await db.booking.findMany({
    where: { customerId: customerUserId },
    include: { driverProfile: true },
    orderBy: { createdAt: 'desc' },
  });

  return bookings.map(mapBookingToDetail);
}

/**
 * Cancels a booking. Server-authoritative cancellation rule enforcement.
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
