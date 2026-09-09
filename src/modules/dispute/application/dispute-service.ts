import 'server-only';
import { DisputeStatus, DisputeCategory } from '@prisma/client';
import { prisma, type Db } from '@/shared/database/prisma';
import { logger } from '@/shared/logging/logger';
import { initiateRefund } from '@/modules/finance/application/services/refund-service';
import { validateDisputeStateTransition } from '../domain/dispute-state-machine';
import { CreateDisputeInput, UpdateDisputeStatusInput, ResolveDisputeInput } from '../domain/types';

function generateDisputeNumber(): string {
  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const randomHex = Math.floor(Math.random() * 0xffff)
    .toString(16)
    .padStart(4, '0')
    .toUpperCase();
  return `DISP-${dateStr}-${randomHex}`;
}

export async function createDispute(input: CreateDisputeInput, db: Db = prisma) {
  return await db.$transaction(async (tx) => {
    // 1. Validate booking existence
    const booking = await tx.booking.findUnique({
      where: { id: input.bookingId },
      include: { driverProfile: true },
    });

    if (!booking) {
      throw new Error(`Booking not found: ${input.bookingId}`);
    }

    // 2. Validate ownership: user must be customer or driver of the booking
    const isCustomer = booking.customerId === input.raisedByUserId;
    const isDriver = booking.driverProfile?.userId === input.raisedByUserId;

    if (!isCustomer && !isDriver) {
      throw new Error('User is not authorized to raise a dispute for this booking');
    }

    // Check if open dispute already exists for this booking raised by this user
    const existing = await tx.dispute.findFirst({
      where: {
        bookingId: input.bookingId,
        raisedByUserId: input.raisedByUserId,
        status: { in: ['OPEN', 'UNDER_REVIEW', 'ESCALATED'] },
      },
    });

    if (existing) {
      return existing;
    }

    // 3. Create Dispute
    const disputeNumber = generateDisputeNumber();
    const dispute = await tx.dispute.create({
      data: {
        disputeNumber,
        bookingId: input.bookingId,
        raisedByUserId: input.raisedByUserId,
        category: input.category ?? DisputeCategory.PAYMENT_ISSUE,
        status: DisputeStatus.OPEN,
        reason: input.reason,
        evidenceUrls: input.evidenceUrls ?? [],
        logs: {
          create: {
            action: 'DISPUTE_CREATED',
            fromStatus: null,
            toStatus: DisputeStatus.OPEN,
            performedBy: input.raisedByUserId,
            notes: input.reason,
          },
        },
      },
      include: {
        logs: true,
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

    // 4. Audit Log
    await tx.auditLog.create({
      data: {
        actorId: input.raisedByUserId,
        action: 'dispute.created',
        entityType: 'Dispute',
        entityId: dispute.id,
        payload: {
          disputeNumber,
          bookingId: input.bookingId,
          category: input.category,
        },
      },
    });

    // 5. Outbox Event
    await tx.outboxEvent.create({
      data: {
        eventType: 'dispute.created',
        aggregateType: 'Dispute',
        aggregateId: dispute.id,
        payload: {
          disputeId: dispute.id,
          disputeNumber: dispute.disputeNumber,
          bookingId: dispute.bookingId,
          raisedByUserId: dispute.raisedByUserId,
          category: dispute.category,
          createdAt: dispute.createdAt.toISOString(),
        },
      },
    });

    logger.info(
      { disputeId: dispute.id, disputeNumber: dispute.disputeNumber },
      'Dispute created successfully',
    );

    return dispute;
  });
}

export async function updateDisputeStatus(input: UpdateDisputeStatusInput, db: Db = prisma) {
  return await db.$transaction(async (tx) => {
    const existing = await tx.dispute.findUnique({
      where: { id: input.disputeId },
    });

    if (!existing) {
      throw new Error(`Dispute not found: ${input.disputeId}`);
    }

    validateDisputeStateTransition(existing.status, input.toStatus);

    const updated = await tx.dispute.update({
      where: { id: input.disputeId },
      data: {
        status: input.toStatus,
        assignedOperatorId: input.assignedOperatorId ?? existing.assignedOperatorId,
        resolvedAt: input.toStatus === DisputeStatus.RESOLVED ? new Date() : existing.resolvedAt,
        logs: {
          create: {
            action: `STATUS_CHANGED_${input.toStatus}`,
            fromStatus: existing.status,
            toStatus: input.toStatus,
            performedBy: input.actionUserId,
            notes: input.notes ?? `Status updated to ${input.toStatus}`,
          },
        },
      },
      include: { logs: true },
    });

    await tx.auditLog.create({
      data: {
        actorId: input.actionUserId,
        action: `dispute.${input.toStatus.toLowerCase()}`,
        entityType: 'Dispute',
        entityId: updated.id,
        payload: {
          fromStatus: existing.status,
          toStatus: input.toStatus,
          notes: input.notes,
        },
      },
    });

    await tx.outboxEvent.create({
      data: {
        eventType: 'dispute.status_changed',
        aggregateType: 'Dispute',
        aggregateId: updated.id,
        payload: {
          disputeId: updated.id,
          disputeNumber: updated.disputeNumber,
          fromStatus: existing.status,
          toStatus: updated.status,
          raisedByUserId: updated.raisedByUserId,
        },
      },
    });

    return updated;
  });
}

export async function resolveDispute(input: ResolveDisputeInput, db: Db = prisma) {
  // Check if financial refund is requested
  let refundResultSummary: string | undefined = input.financialAdjustmentSummary;

  if (input.refundAmountMinorUnits && input.refundAmountMinorUnits > 0) {
    const disputeObj = await db.dispute.findUnique({
      where: { id: input.disputeId },
      include: { booking: { include: { payments: true } } },
    });

    if (!disputeObj) {
      throw new Error(`Dispute not found: ${input.disputeId}`);
    }

    // Find captured payment for booking
    const capturedPayment = disputeObj.booking.payments.find(
      (p) => p.status === 'CAPTURED' || p.status === 'PARTIALLY_REFUNDED',
    );

    if (capturedPayment) {
      const refundAmountDecimal = (input.refundAmountMinorUnits / 100).toFixed(4);
      try {
        const refundRes = await initiateRefund(
          input.actionUserId,
          {
            paymentId: capturedPayment.id,
            amount: refundAmountDecimal,
            reason: `Dispute resolution ${disputeObj.disputeNumber}: ${input.resolutionSummary}`,
            idempotencyKey: `disp-refund-${disputeObj.id}-${input.refundAmountMinorUnits}`,
          },
          db,
        );
        refundResultSummary = `Processed refund of ₹${(input.refundAmountMinorUnits / 100).toFixed(2)} (Refund ID: ${refundRes.id})`;
      } catch (err: unknown) {
        const errMsg = err instanceof Error ? err.message : 'Provider error';
        logger.error(
          { error: err, disputeId: input.disputeId },
          'Financial refund initiation failed during dispute resolution',
        );
        refundResultSummary = `Refund processing failed: ${errMsg}`;
      }
    }
  }

  return await db.$transaction(async (tx) => {
    const existing = await tx.dispute.findUnique({
      where: { id: input.disputeId },
    });

    if (!existing) {
      throw new Error(`Dispute not found: ${input.disputeId}`);
    }

    validateDisputeStateTransition(existing.status, DisputeStatus.RESOLVED);

    const updated = await tx.dispute.update({
      where: { id: input.disputeId },
      data: {
        status: DisputeStatus.RESOLVED,
        resolutionSummary: input.resolutionSummary,
        refundAmountMinorUnits: input.refundAmountMinorUnits ?? existing.refundAmountMinorUnits,
        financialAdjustmentSummary: refundResultSummary ?? existing.financialAdjustmentSummary,
        resolvedAt: new Date(),
        logs: {
          create: {
            action: 'DISPUTE_RESOLVED',
            fromStatus: existing.status,
            toStatus: DisputeStatus.RESOLVED,
            performedBy: input.actionUserId,
            notes: input.notes ?? input.resolutionSummary,
          },
        },
      },
      include: { logs: true },
    });

    await tx.auditLog.create({
      data: {
        actorId: input.actionUserId,
        action: 'dispute.resolved',
        entityType: 'Dispute',
        entityId: updated.id,
        payload: {
          disputeNumber: updated.disputeNumber,
          resolutionSummary: input.resolutionSummary,
          refundAmountMinorUnits: input.refundAmountMinorUnits,
        },
      },
    });

    await tx.outboxEvent.create({
      data: {
        eventType: 'dispute.resolved',
        aggregateType: 'Dispute',
        aggregateId: updated.id,
        payload: {
          disputeId: updated.id,
          disputeNumber: updated.disputeNumber,
          raisedByUserId: updated.raisedByUserId,
          resolutionSummary: updated.resolutionSummary,
          refundAmountMinorUnits: updated.refundAmountMinorUnits,
        },
      },
    });

    return updated;
  });
}

export async function listDisputes(
  filters: {
    status?: DisputeStatus;
    category?: DisputeCategory;
    raisedByUserId?: string;
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
  if (filters.category) where.category = filters.category;
  if (filters.raisedByUserId) where.raisedByUserId = filters.raisedByUserId;
  if (filters.bookingId) where.bookingId = filters.bookingId;
  if (filters.search) {
    where.OR = [
      { disputeNumber: { contains: filters.search, mode: 'insensitive' } },
      { reason: { contains: filters.search, mode: 'insensitive' } },
    ];
  }

  const [items, total] = await Promise.all([
    db.dispute.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
      include: {
        logs: { orderBy: { createdAt: 'asc' } },
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
    db.dispute.count({ where }),
  ]);

  return {
    items,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  };
}

export async function getDisputeById(disputeId: string, db: Db = prisma) {
  return await db.dispute.findUnique({
    where: { id: disputeId },
    include: {
      logs: { orderBy: { createdAt: 'asc' } },
      booking: {
        select: {
          id: true,
          status: true,
          pickupAddress: true,
          customerId: true,
          driverProfileId: true,
          payments: true,
        },
      },
    },
  });
}
