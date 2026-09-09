import 'server-only';
import { SafetyIncidentStatus, SafetyIncidentSeverity, SafetyIncidentType } from '@prisma/client';
import { prisma, type Db } from '@/shared/database/prisma';
import { logger } from '@/shared/logging/logger';
import { validateSafetyStateTransition } from '../domain/safety-state-machine';
import {
  TriggerSosInput,
  UpdateSafetyIncidentStatusInput,
  AssignSafetyOperatorInput,
} from '../domain/types';

function generateIncidentNumber(): string {
  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const randomHex = Math.floor(Math.random() * 0xffff)
    .toString(16)
    .padStart(4, '0')
    .toUpperCase();
  return `SOS-${dateStr}-${randomHex}`;
}

export async function triggerSos(input: TriggerSosInput, db: Db = prisma) {
  return await db.$transaction(async (tx) => {
    // 1. Check idempotency key if provided
    if (input.idempotencyKey) {
      const existing = await tx.safetyIncident.findUnique({
        where: { idempotencyKey: input.idempotencyKey },
        include: { timelineEntries: true },
      });
      if (existing) {
        return existing;
      }
    }

    // 2. Identify active booking context if not directly provided
    let bookingId = input.bookingId;
    let customerId: string | null = null;
    let driverProfileId: string | null = null;

    if (bookingId) {
      const booking = await tx.booking.findUnique({
        where: { id: bookingId },
        include: { driverProfile: true },
      });
      if (booking) {
        customerId = booking.customerId;
        driverProfileId = booking.driverProfileId;
      }
    } else {
      // Find active booking for reporter user
      const driverProfile = await tx.driverProfile.findUnique({
        where: { userId: input.reporterUserId },
      });

      const activeBooking = await tx.booking.findFirst({
        where: {
          OR: [
            { customerId: input.reporterUserId },
            ...(driverProfile ? [{ driverProfileId: driverProfile.id }] : []),
          ],
          status: {
            in: [
              'SEARCHING_DRIVER',
              'DRIVER_ASSIGNED',
              'DRIVER_EN_ROUTE',
              'DRIVER_ARRIVED',
              'TRIP_IN_PROGRESS',
            ],
          },
        },
        orderBy: { createdAt: 'desc' },
      });

      if (activeBooking) {
        bookingId = activeBooking.id;
        customerId = activeBooking.customerId;
        driverProfileId = activeBooking.driverProfileId;
      }
    }

    // If customerId/driverProfileId not found from booking, check driver profile of reporter
    if (!driverProfileId) {
      const dp = await tx.driverProfile.findUnique({ where: { userId: input.reporterUserId } });
      if (dp) driverProfileId = dp.id;
    }
    if (!customerId && input.reporterUserId !== driverProfileId) {
      customerId = input.reporterUserId;
    }

    // 3. Deduplication Policy: Prevent rapid repeated SOS triggers (within 5 mins) for same reporter and booking
    if (bookingId) {
      const fiveMinsAgo = new Date(Date.now() - 5 * 60 * 1000);
      const recentIncident = await tx.safetyIncident.findFirst({
        where: {
          reporterUserId: input.reporterUserId,
          bookingId: bookingId,
          createdAt: { gte: fiveMinsAgo },
          status: { in: ['OPEN', 'ACKNOWLEDGED', 'INVESTIGATING', 'ESCALATED'] },
        },
        include: { timelineEntries: true },
      });

      if (recentIncident) {
        logger.info(
          { reporterUserId: input.reporterUserId, bookingId, incidentId: recentIncident.id },
          'Deduplicated rapid repeated SOS trigger',
        );
        return recentIncident;
      }
    }

    // 4. Capture location snapshot if missing
    let latitude = input.latitude ?? null;
    let longitude = input.longitude ?? null;
    let locationAccuracy = input.locationAccuracy ?? null;
    const snapshotAddress = input.snapshotAddress ?? null;

    if (latitude === null || longitude === null) {
      if (driverProfileId) {
        const driverLoc = await tx.driverCurrentLocation.findUnique({
          where: { driverProfileId },
        });
        if (driverLoc) {
          latitude = driverLoc.latitude;
          longitude = driverLoc.longitude;
          locationAccuracy = driverLoc.accuracy;
        }
      } else if (customerId) {
        const custLoc = await tx.customerCurrentLocation.findUnique({
          where: { userId: customerId },
        });
        if (custLoc) {
          latitude = custLoc.latitude;
          longitude = custLoc.longitude;
          locationAccuracy = custLoc.accuracy;
        }
      }
    }

    // 5. Create SafetyIncident
    const incidentNumber = generateIncidentNumber();
    const incident = await tx.safetyIncident.create({
      data: {
        incidentNumber,
        type: input.type ?? SafetyIncidentType.SOS_EMERGENCY,
        severity: input.severity ?? SafetyIncidentSeverity.CRITICAL,
        status: SafetyIncidentStatus.OPEN,
        bookingId: bookingId ?? null,
        reporterUserId: input.reporterUserId,
        customerId,
        driverProfileId,
        latitude,
        longitude,
        locationAccuracy,
        snapshotAddress,
        description: input.description ?? 'SOS Emergency triggered by user',
        idempotencyKey: input.idempotencyKey ?? null,
        timelineEntries: {
          create: {
            action: 'SOS_TRIGGERED',
            fromStatus: null,
            toStatus: SafetyIncidentStatus.OPEN,
            performedBy: input.reporterUserId,
            notes: input.description ?? 'SOS Emergency triggered',
          },
        },
      },
      include: {
        timelineEntries: true,
        booking: {
          select: {
            id: true,
            status: true,
            pickupAddress: true,
            customerId: true,
            driverProfileId: true,
          },
        },
      },
    });

    // 6. Record AuditLog
    await tx.auditLog.create({
      data: {
        actorId: input.reporterUserId,
        action: 'safety.sos.triggered',
        entityType: 'SafetyIncident',
        entityId: incident.id,
        payload: {
          incidentNumber,
          type: incident.type,
          severity: incident.severity,
          bookingId,
          latitude,
          longitude,
        },
      },
    });

    // 7. Insert OutboxEvent
    await tx.outboxEvent.create({
      data: {
        eventType: 'safety.incident.created',
        aggregateType: 'SafetyIncident',
        aggregateId: incident.id,
        payload: {
          incidentId: incident.id,
          incidentNumber: incident.incidentNumber,
          type: incident.type,
          severity: incident.severity,
          reporterUserId: incident.reporterUserId,
          customerId: incident.customerId,
          driverProfileId: incident.driverProfileId,
          bookingId: incident.bookingId,
          createdAt: incident.createdAt.toISOString(),
        },
      },
    });

    logger.info(
      { incidentId: incident.id, incidentNumber: incident.incidentNumber },
      'Safety SOS incident created successfully',
    );

    return incident;
  });
}

export async function updateSafetyIncidentStatus(
  input: UpdateSafetyIncidentStatusInput,
  db: Db = prisma,
) {
  return await db.$transaction(async (tx) => {
    const existing = await tx.safetyIncident.findUnique({
      where: { id: input.incidentId },
    });

    if (!existing) {
      throw new Error(`Safety incident not found: ${input.incidentId}`);
    }

    validateSafetyStateTransition(existing.status, input.toStatus);

    const isResolving = input.toStatus === SafetyIncidentStatus.RESOLVED;
    const isAcknowledging = input.toStatus === SafetyIncidentStatus.ACKNOWLEDGED;

    const updated = await tx.safetyIncident.update({
      where: { id: input.incidentId },
      data: {
        status: input.toStatus,
        assignedOperatorId: input.assignedOperatorId ?? existing.assignedOperatorId,
        resolutionSummary: input.resolutionSummary ?? existing.resolutionSummary,
        acknowledgedAt: isAcknowledging ? new Date() : existing.acknowledgedAt,
        resolvedAt: isResolving ? new Date() : existing.resolvedAt,
        timelineEntries: {
          create: {
            action: `STATUS_CHANGED_${input.toStatus}`,
            fromStatus: existing.status,
            toStatus: input.toStatus,
            performedBy: input.actionUserId,
            notes: input.notes ?? input.resolutionSummary ?? `Status changed to ${input.toStatus}`,
          },
        },
      },
      include: {
        timelineEntries: true,
      },
    });

    // Record Audit Log
    await tx.auditLog.create({
      data: {
        actorId: input.actionUserId,
        action: `safety.incident.${input.toStatus.toLowerCase()}`,
        entityType: 'SafetyIncident',
        entityId: updated.id,
        payload: {
          fromStatus: existing.status,
          toStatus: input.toStatus,
          notes: input.notes,
        },
      },
    });

    // Outbox event
    await tx.outboxEvent.create({
      data: {
        eventType: 'safety.incident.updated',
        aggregateType: 'SafetyIncident',
        aggregateId: updated.id,
        payload: {
          incidentId: updated.id,
          incidentNumber: updated.incidentNumber,
          fromStatus: existing.status,
          toStatus: updated.status,
          reporterUserId: updated.reporterUserId,
          customerId: updated.customerId,
          assignedOperatorId: updated.assignedOperatorId,
        },
      },
    });

    return updated;
  });
}

export async function assignSafetyOperator(input: AssignSafetyOperatorInput, db: Db = prisma) {
  return await db.$transaction(async (tx) => {
    const existing = await tx.safetyIncident.findUnique({
      where: { id: input.incidentId },
    });

    if (!existing) {
      throw new Error(`Safety incident not found: ${input.incidentId}`);
    }

    const updated = await tx.safetyIncident.update({
      where: { id: input.incidentId },
      data: {
        assignedOperatorId: input.assignedOperatorId,
        status:
          existing.status === SafetyIncidentStatus.OPEN
            ? SafetyIncidentStatus.ACKNOWLEDGED
            : existing.status,
        acknowledgedAt: existing.acknowledgedAt ?? new Date(),
        timelineEntries: {
          create: {
            action: 'OPERATOR_ASSIGNED',
            fromStatus: existing.status,
            toStatus:
              existing.status === SafetyIncidentStatus.OPEN
                ? SafetyIncidentStatus.ACKNOWLEDGED
                : existing.status,
            performedBy: input.assignedByUserId,
            notes: input.notes ?? `Operator ${input.assignedOperatorId} assigned to incident`,
          },
        },
      },
      include: {
        timelineEntries: true,
      },
    });

    await tx.auditLog.create({
      data: {
        actorId: input.assignedByUserId,
        action: 'safety.incident.assigned',
        entityType: 'SafetyIncident',
        entityId: updated.id,
        payload: {
          assignedOperatorId: input.assignedOperatorId,
        },
      },
    });

    return updated;
  });
}

export async function listSafetyIncidents(
  filters: {
    status?: SafetyIncidentStatus;
    severity?: SafetyIncidentSeverity;
    reporterUserId?: string;
    bookingId?: string;
    search?: string;
    page?: number;
    limit?: number;
  },
  db: Db = prisma,
) {
  const page = Math.max(1, filters.page ?? 1);
  const limit = Math.min(100, Math.max(1, filters.limit ?? 20));
  const skip = (page - 1) * limit;

  const where: Record<string, unknown> = {};
  if (filters.status) where.status = filters.status;
  if (filters.severity) where.severity = filters.severity;
  if (filters.reporterUserId) where.reporterUserId = filters.reporterUserId;
  if (filters.bookingId) where.bookingId = filters.bookingId;
  if (filters.search) {
    where.OR = [
      { incidentNumber: { contains: filters.search, mode: 'insensitive' } },
      { description: { contains: filters.search, mode: 'insensitive' } },
    ];
  }

  const [items, total] = await Promise.all([
    db.safetyIncident.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
      include: {
        timelineEntries: { orderBy: { createdAt: 'asc' } },
        booking: {
          select: {
            id: true,
            status: true,
            pickupAddress: true,
            customerId: true,
            driverProfileId: true,
          },
        },
      },
    }),
    db.safetyIncident.count({ where }),
  ]);

  return {
    items,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  };
}

export async function getSafetyIncidentById(incidentId: string, db: Db = prisma) {
  return await db.safetyIncident.findUnique({
    where: { id: incidentId },
    include: {
      timelineEntries: { orderBy: { createdAt: 'asc' } },
      booking: {
        select: {
          id: true,
          status: true,
          pickupAddress: true,
          customerId: true,
          driverProfileId: true,
        },
      },
      // Selected so callers can compare against the *user* id of the
      // assigned driver — incident.driverProfileId is a DriverProfile id,
      // never directly comparable to a principal's userId.
      driverProfile: { select: { userId: true } },
    },
  });
}

type IncidentOwnershipFields = {
  reporterUserId: string;
  customerId: string | null;
  driverProfile: { userId: string } | null;
};

/**
 * The read-access check for a single safety incident: reporter, the
 * incident's customer, or its actually-assigned driver (by user id, never
 * by comparing a DriverProfile id against a User id — that comparison is
 * always false and was the bug this replaces; see the route's prior
 * `isDriver = incident.booking?.driverProfileId && incident.driverProfileId`
 * tautology, which let any caller holding SAFETY_INCIDENT_READ — a
 * permission both CUSTOMER and DRIVER roles hold broadly — view any
 * incident that merely had *some* driver attached).
 */
export function isAuthorizedToViewIncident(
  incident: IncidentOwnershipFields,
  userId: string,
): boolean {
  return (
    incident.reporterUserId === userId ||
    incident.customerId === userId ||
    incident.driverProfile?.userId === userId
  );
}
