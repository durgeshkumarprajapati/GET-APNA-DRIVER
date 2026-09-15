import 'server-only';
import { ScheduledRideStatus, ScheduleType, type Prisma } from '@prisma/client';
import { prisma, type Db } from '@/shared/database/prisma';
import { validateCoordinates } from '@/modules/location/application/distance-service';
import { insertOutboxEvent } from '@/shared/outbox/outbox-service';
import { recordAuditLog } from '@/shared/audit/audit-service';
import { calculateNextOccurrence } from '../domain/recurrence-calculator';
import type { CreateScheduledRideInput, ScheduledRideDTO } from '../domain/types';
import {
  ScheduledRideNotFoundError,
  ScheduledRideForbiddenError,
  ScheduledRideNotActiveError,
  ScheduledRidePastDateError,
  InvalidRecurrenceConfigurationError,
} from '../domain/errors';

export async function createScheduledRide(
  input: CreateScheduledRideInput,
  customerId: string,
  db: Db = prisma,
): Promise<ScheduledRideDTO> {
  validateCoordinates(input.pickupLatitude, input.pickupLongitude);
  if (
    input.dropoffLatitude !== undefined &&
    input.dropoffLatitude !== null &&
    input.dropoffLongitude !== undefined &&
    input.dropoffLongitude !== null
  ) {
    validateCoordinates(input.dropoffLatitude, input.dropoffLongitude);
  }

  const now = new Date();
  const startAt = input.startAt ? new Date(input.startAt) : now;
  const endAt = input.endAt ? new Date(input.endAt) : null;
  const scheduledDate = input.scheduledDate ? new Date(input.scheduledDate) : null;

  if (input.scheduleType === ScheduleType.ONE_TIME && scheduledDate) {
    const minLeadTimeMs = 15 * 60 * 1000; // 15 minutes
    const timeMatch = /^([0-1]?[0-9]|2[0-3]):([0-5][0-9])$/.exec(input.scheduledTime.trim());
    if (timeMatch) {
      const scheduledDateTime = new Date(scheduledDate);
      scheduledDateTime.setHours(parseInt(timeMatch[1], 10), parseInt(timeMatch[2], 10), 0, 0);
      if (scheduledDateTime.getTime() - now.getTime() < minLeadTimeMs) {
        throw new ScheduledRidePastDateError();
      }
    }
  }

  // Calculate first next occurrence
  const nextOccurrenceAt = calculateNextOccurrence({
    scheduleType: input.scheduleType,
    scheduledTime: input.scheduledTime,
    scheduledDate,
    recurrenceFrequency: input.recurrenceFrequency,
    daysOfWeek: input.daysOfWeek,
    startAt,
    endAt,
    fromTime: now,
  });

  if (!nextOccurrenceAt) {
    throw new InvalidRecurrenceConfigurationError(
      'Could not calculate a valid future occurrence date for this schedule.',
    );
  }

  const scheduledRide = await db.$transaction(async (tx) => {
    const created = await tx.scheduledRide.create({
      data: {
        idempotencyKey: input.idempotencyKey || null,
        customerId,
        status: ScheduledRideStatus.ACTIVE,
        scheduleType: input.scheduleType,
        bookingType: input.bookingType || 'ONE_WAY',
        pickupLatitude: input.pickupLatitude,
        pickupLongitude: input.pickupLongitude,
        pickupAddress: input.pickupAddress,
        pickupLabel: input.pickupLabel || null,
        dropoffLatitude: input.dropoffLatitude || null,
        dropoffLongitude: input.dropoffLongitude || null,
        dropoffAddress: input.dropoffAddress || null,
        dropoffLabel: input.dropoffLabel || null,
        savedLocationId: input.savedLocationId || null,
        vehicleCategory: input.vehicleCategory || 'SEDAN',
        preferredDriverProfileId: input.preferredDriverProfileId || null,
        promotionCode: input.promotionCode || null,
        scheduledTime: input.scheduledTime,
        scheduledDate,
        recurrenceFrequency: input.recurrenceFrequency || null,
        daysOfWeek: input.daysOfWeek || [],
        timezone: input.timezone || 'Asia/Kolkata',
        startAt,
        endAt,
        nextOccurrenceAt,
        notes: input.notes || null,
      },
      include: {
        preferredDriver: true,
      },
    });

    await insertOutboxEvent(tx, {
      eventType: 'scheduled-ride.created',
      aggregateType: 'SCHEDULED_RIDE',
      aggregateId: created.id,
      payload: {
        scheduledRideId: created.id,
        customerId,
        scheduleType: created.scheduleType,
        nextOccurrenceAt: nextOccurrenceAt.toISOString(),
      },
    });

    await recordAuditLog(tx, {
      actorUserId: customerId,
      action: 'SCHEDULED_RIDE_CREATE',
      entityType: 'SCHEDULED_RIDE',
      entityId: created.id,
      afterState: {
        scheduleType: created.scheduleType,
        scheduledTime: created.scheduledTime,
        nextOccurrenceAt: nextOccurrenceAt.toISOString(),
      },
    });

    return created;
  });

  return mapToDTO(scheduledRide);
}

export async function getCustomerScheduledRides(
  customerId: string,
  take = 20,
  skip = 0,
  db: Db = prisma,
): Promise<ScheduledRideDTO[]> {
  const rides = await db.scheduledRide.findMany({
    where: { customerId },
    include: { preferredDriver: true },
    orderBy: { createdAt: 'desc' },
    take: Math.min(50, Math.max(1, take)),
    skip,
  });

  return rides.map(mapToDTO);
}

export async function getScheduledRideById(
  id: string,
  customerId: string,
  db: Db = prisma,
): Promise<ScheduledRideDTO> {
  const ride = await db.scheduledRide.findUnique({
    where: { id },
    include: { preferredDriver: true },
  });

  if (!ride) {
    throw new ScheduledRideNotFoundError(id);
  }

  if (ride.customerId !== customerId) {
    throw new ScheduledRideForbiddenError();
  }

  return mapToDTO(ride);
}

export async function pauseScheduledRide(
  id: string,
  customerId: string,
  db: Db = prisma,
): Promise<ScheduledRideDTO> {
  const ride = await getScheduledRideById(id, customerId, db);

  if (ride.status !== ScheduledRideStatus.ACTIVE) {
    throw new ScheduledRideNotActiveError(ride.status);
  }

  const updated = await db.scheduledRide.update({
    where: { id },
    data: {
      status: ScheduledRideStatus.PAUSED,
    },
    include: { preferredDriver: true },
  });

  return mapToDTO(updated);
}

export async function resumeScheduledRide(
  id: string,
  customerId: string,
  db: Db = prisma,
): Promise<ScheduledRideDTO> {
  const ride = await getScheduledRideById(id, customerId, db);

  if (ride.status !== ScheduledRideStatus.PAUSED) {
    throw new ScheduledRideNotActiveError(ride.status);
  }

  const now = new Date();
  const nextOccurrenceAt = calculateNextOccurrence({
    scheduleType: ride.scheduleType,
    scheduledTime: ride.scheduledTime,
    scheduledDate: ride.scheduledDate ? new Date(ride.scheduledDate) : null,
    recurrenceFrequency: ride.recurrenceFrequency,
    daysOfWeek: ride.daysOfWeek,
    startAt: new Date(ride.startAt),
    endAt: ride.endAt ? new Date(ride.endAt) : null,
    fromTime: now,
  });

  const updated = await db.scheduledRide.update({
    where: { id },
    data: {
      status: ScheduledRideStatus.ACTIVE,
      nextOccurrenceAt,
    },
    include: { preferredDriver: true },
  });

  return mapToDTO(updated);
}

export async function cancelScheduledRide(
  id: string,
  customerId: string,
  reason?: string,
  db: Db = prisma,
): Promise<ScheduledRideDTO> {
  const ride = await getScheduledRideById(id, customerId, db);

  if (
    ride.status === ScheduledRideStatus.CANCELLED ||
    ride.status === ScheduledRideStatus.COMPLETED
  ) {
    return ride;
  }

  const now = new Date();
  const updated = await db.$transaction(async (tx) => {
    const res = await tx.scheduledRide.update({
      where: { id },
      data: {
        status: ScheduledRideStatus.CANCELLED,
        cancelledAt: now,
        failureReason: reason || 'Cancelled by customer',
      },
      include: { preferredDriver: true },
    });

    await insertOutboxEvent(tx, {
      eventType: 'scheduled-ride.cancelled',
      aggregateType: 'SCHEDULED_RIDE',
      aggregateId: id,
      payload: {
        scheduledRideId: id,
        customerId,
        reason: reason || 'Cancelled by customer',
      },
    });

    await recordAuditLog(tx, {
      actorUserId: customerId,
      action: 'SCHEDULED_RIDE_CANCEL',
      entityType: 'SCHEDULED_RIDE',
      entityId: id,
      afterState: { reason },
    });

    return res;
  });

  return mapToDTO(updated);
}

export async function listAdminScheduledRides(
  status?: string,
  take = 20,
  skip = 0,
  db: Db = prisma,
): Promise<ScheduledRideDTO[]> {
  const where: Prisma.ScheduledRideWhereInput = {};
  if (status && Object.values(ScheduledRideStatus).includes(status as ScheduledRideStatus)) {
    where.status = status as ScheduledRideStatus;
  }

  const rides = await db.scheduledRide.findMany({
    where,
    include: { preferredDriver: true },
    orderBy: { createdAt: 'desc' },
    take: Math.min(100, Math.max(1, take)),
    skip,
  });

  return rides.map(mapToDTO);
}

export async function adminCancelScheduledRide(
  id: string,
  reason: string,
  adminUserId: string,
  db: Db = prisma,
): Promise<ScheduledRideDTO> {
  const ride = await db.scheduledRide.findUnique({
    where: { id },
    include: { preferredDriver: true },
  });

  if (!ride) {
    throw new ScheduledRideNotFoundError(id);
  }

  const now = new Date();
  const updated = await db.$transaction(async (tx) => {
    const res = await tx.scheduledRide.update({
      where: { id },
      data: {
        status: ScheduledRideStatus.CANCELLED,
        cancelledAt: now,
        failureReason: `Admin cancellation: ${reason}`,
      },
      include: { preferredDriver: true },
    });

    await insertOutboxEvent(tx, {
      eventType: 'scheduled-ride.admin_cancelled',
      aggregateType: 'SCHEDULED_RIDE',
      aggregateId: id,
      payload: {
        scheduledRideId: id,
        adminUserId,
        reason,
      },
    });

    await recordAuditLog(tx, {
      actorUserId: adminUserId,
      action: 'ADMIN_SCHEDULED_RIDE_CANCEL',
      entityType: 'SCHEDULED_RIDE',
      entityId: id,
      afterState: { reason },
    });

    return res;
  });

  return mapToDTO(updated);
}

function mapToDTO(
  ride: Prisma.ScheduledRideGetPayload<{ include: { preferredDriver: true } }>,
): ScheduledRideDTO {
  return {
    id: ride.id,
    customerId: ride.customerId,
    status: ride.status,
    scheduleType: ride.scheduleType,
    bookingType: ride.bookingType,
    pickupLocation: {
      latitude: ride.pickupLatitude,
      longitude: ride.pickupLongitude,
      address: ride.pickupAddress,
      label: ride.pickupLabel,
    },
    dropoffLocation:
      ride.dropoffLatitude !== null &&
      ride.dropoffLongitude !== null &&
      ride.dropoffAddress !== null
        ? {
            latitude: ride.dropoffLatitude,
            longitude: ride.dropoffLongitude,
            address: ride.dropoffAddress,
            label: ride.dropoffLabel,
          }
        : null,
    savedLocationId: ride.savedLocationId,
    vehicleCategory: ride.vehicleCategory,
    preferredDriver: ride.preferredDriver
      ? {
          id: ride.preferredDriver.id,
          displayName: ride.preferredDriver.displayName,
        }
      : null,
    promotionCode: ride.promotionCode,
    scheduledTime: ride.scheduledTime,
    scheduledDate: ride.scheduledDate ? ride.scheduledDate.toISOString() : null,
    recurrenceFrequency: ride.recurrenceFrequency,
    daysOfWeek: ride.daysOfWeek,
    timezone: ride.timezone,
    startAt: ride.startAt.toISOString(),
    endAt: ride.endAt ? ride.endAt.toISOString() : null,
    nextOccurrenceAt: ride.nextOccurrenceAt ? ride.nextOccurrenceAt.toISOString() : null,
    lastGeneratedAt: ride.lastGeneratedAt ? ride.lastGeneratedAt.toISOString() : null,
    failureReason: ride.failureReason,
    notes: ride.notes,
    createdAt: ride.createdAt.toISOString(),
    updatedAt: ride.updatedAt.toISOString(),
  };
}
