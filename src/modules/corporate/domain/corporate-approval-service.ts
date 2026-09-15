import { prisma } from '@/shared/database/prisma';
import { insertOutboxEvent } from '@/shared/outbox/outbox-service';
import { recordAuditLog } from '@/shared/audit/audit-service';
import { ApprovalStatus, Prisma } from '@prisma/client';

export interface CreateApprovalRequestParams {
  organizationId: string;
  requesterUserId: string;
  bookingParameters: Record<string, unknown>;
  policyViolations?: Array<{ rule: string; message: string }>;
  reason?: string;
}

export interface ReviewApprovalRequestParams {
  approvalRequestId: string;
  approverUserId: string;
  status: 'APPROVED' | 'REJECTED';
  reviewComment?: string;
}

export async function createApprovalRequest(params: CreateApprovalRequestParams) {
  return await prisma.$transaction(async (tx) => {
    const request = await tx.corporateApprovalRequest.create({
      data: {
        organizationId: params.organizationId,
        requesterUserId: params.requesterUserId,
        status: ApprovalStatus.PENDING,
        bookingParameters: params.bookingParameters as unknown as Prisma.InputJsonValue,
        policyViolations: params.policyViolations ? (params.policyViolations as unknown as Prisma.InputJsonValue) : Prisma.JsonNull,
        reason: params.reason,
        requestedAt: new Date(),
      },
      include: {
        organization: true,
        requesterUser: true,
      },
    });

    await recordAuditLog(tx, {
      actorUserId: params.requesterUserId,
      action: 'CORPORATE_APPROVAL_REQUEST_CREATE',
      entityType: 'CORPORATE_APPROVAL_REQUEST',
      entityId: request.id,
      afterState: { organizationId: params.organizationId },
    });

    await insertOutboxEvent(tx, {
      aggregateType: 'CORPORATE_APPROVAL',
      aggregateId: request.id,
      eventType: 'CORPORATE_APPROVAL_REQUESTED',
      payload: {
        approvalRequestId: request.id,
        organizationId: request.organizationId,
        organizationName: request.organization.name,
        requesterUserId: request.requesterUserId,
        bookingParameters: params.bookingParameters,
      },
    });

    return request;
  });
}

export async function reviewApprovalRequest(params: ReviewApprovalRequestParams) {
  return await prisma.$transaction(async (tx) => {
    // Concurrency safety check - request must be PENDING
    const existing = await tx.corporateApprovalRequest.findUnique({
      where: { id: params.approvalRequestId },
      include: { organization: true, requesterUser: true },
    });

    if (!existing) {
      throw new Error('Approval request not found.');
    }

    if (existing.status !== ApprovalStatus.PENDING) {
      throw new Error(`Approval request has already been reviewed (${existing.status}).`);
    }

    const newStatus =
      params.status === 'APPROVED' ? ApprovalStatus.APPROVED : ApprovalStatus.REJECTED;

    const updated = await tx.corporateApprovalRequest.update({
      where: { id: params.approvalRequestId },
      data: {
        approverUserId: params.approverUserId,
        status: newStatus,
        reviewComment: params.reviewComment,
        reviewedAt: new Date(),
      },
      include: { organization: true, requesterUser: true, approverUser: true },
    });

    await recordAuditLog(tx, {
      actorUserId: params.approverUserId,
      action: `CORPORATE_APPROVAL_${params.status}`,
      entityType: 'CORPORATE_APPROVAL_REQUEST',
      entityId: updated.id,
      afterState: { reviewComment: params.reviewComment },
    });

    await insertOutboxEvent(tx, {
      aggregateType: 'CORPORATE_APPROVAL',
      aggregateId: updated.id,
      eventType: 'CORPORATE_APPROVAL_REVIEWED',
      payload: {
        approvalRequestId: updated.id,
        organizationId: updated.organizationId,
        organizationName: updated.organization.name,
        requesterUserId: updated.requesterUserId,
        approverUserId: updated.approverUserId,
        status: newStatus,
        reviewComment: params.reviewComment,
      },
    });

    return updated;
  });
}

export async function cancelApprovalRequest(approvalRequestId: string, userId: string) {
  return await prisma.$transaction(async (tx) => {
    const existing = await tx.corporateApprovalRequest.findUnique({
      where: { id: approvalRequestId },
    });

    if (!existing || existing.requesterUserId !== userId) {
      throw new Error('Approval request not found or unauthorized.');
    }

    if (existing.status !== ApprovalStatus.PENDING) {
      throw new Error(`Cannot cancel request in status ${existing.status}.`);
    }

    const cancelled = await tx.corporateApprovalRequest.update({
      where: { id: approvalRequestId },
      data: { status: ApprovalStatus.CANCELLED },
    });

    return cancelled;
  });
}

export async function listOrganizationApprovals(
  organizationId: string,
  status?: ApprovalStatus
) {
  return await prisma.corporateApprovalRequest.findMany({
    where: {
      organizationId,
      ...(status && { status }),
    },
    include: {
      requesterUser: { select: { id: true, customerProfile: true } },
      approverUser: { select: { id: true, customerProfile: true } },
    },
    orderBy: { requestedAt: 'desc' },
  });
}

export async function getApprovalRequestById(id: string) {
  return await prisma.corporateApprovalRequest.findUnique({
    where: { id },
    include: {
      organization: true,
      requesterUser: true,
      approverUser: true,
      bookings: true,
    },
  });
}
