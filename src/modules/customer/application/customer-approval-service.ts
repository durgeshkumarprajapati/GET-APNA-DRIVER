import 'server-only';
import { AccountStatus } from '@prisma/client';
import { prisma, type Db } from '@/shared/database/prisma';
import { recordAuditLog } from '@/shared/audit/audit-service';
import { insertOutboxEvent } from '@/shared/outbox/outbox-service';
import { requirePermission } from '@/modules/identity/authorization/authorization-service';
import { PERMISSIONS } from '@/modules/identity/domain/permission-catalog';
import type { AuthenticatedPrincipal } from '@/modules/identity/domain/types';
import { AppError } from '@/shared/errors/app-error';

export class CustomerNotFoundError extends AppError {
  constructor(customerId: string) {
    super(`Customer '${customerId}' not found.`, 404, 'CUSTOMER_NOT_FOUND');
  }
}

export class InvalidCustomerStatusError extends AppError {
  constructor(currentStatus: string) {
    super(
      `Cannot approve customer in state '${currentStatus}'. Only PENDING customers can be approved.`,
      400,
      'INVALID_CUSTOMER_STATUS',
    );
  }
}

export interface ApproveCustomerInput {
  customerId: string; // Accepts CustomerProfile.id or User.id
  actor: AuthenticatedPrincipal;
}

export interface ApproveCustomerResult {
  customerProfileId: string;
  userId: string;
  previousStatus: AccountStatus;
  newStatus: AccountStatus;
  approvedAt: string;
  approvedByAdminUserId: string;
}

/**
 * Server-authoritative admin customer approval service.
 * Enforces `admin.customer.approve` permission, validates state machine (PENDING -> ACTIVE),
 * writes audit trail and outbox events idempotently.
 */
export async function approveCustomer(
  input: ApproveCustomerInput,
  db: Db = prisma,
): Promise<ApproveCustomerResult> {
  const { customerId, actor } = input;

  // 1. Backend RBAC permission enforcement
  requirePermission(actor, PERMISSIONS.ADMIN_CUSTOMER_APPROVE);

  // 2. Resolve customer profile and user record safely
  const profile = await db.customerProfile.findFirst({
    where: {
      OR: [{ id: customerId }, { userId: customerId }],
    },
    include: { user: true },
  });

  if (!profile) {
    throw new CustomerNotFoundError(customerId);
  }

  const user = profile.user;

  // 3. Idempotency check: If already ACTIVE, return current state safely
  if (user.accountStatus === AccountStatus.ACTIVE) {
    return {
      customerProfileId: profile.id,
      userId: user.id,
      previousStatus: AccountStatus.ACTIVE,
      newStatus: AccountStatus.ACTIVE,
      approvedAt: new Date().toISOString(),
      approvedByAdminUserId: actor.userId,
    };
  }

  // 4. Validate state machine transition (PENDING -> ACTIVE)
  if (user.accountStatus !== AccountStatus.PENDING) {
    throw new InvalidCustomerStatusError(user.accountStatus);
  }

  const previousStatus = user.accountStatus;
  const approvedAt = new Date();

  // 5. Execute state transition in atomic database transaction
  await db.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: user.id },
      data: { accountStatus: AccountStatus.ACTIVE },
    });

    await recordAuditLog(tx, {
      actorUserId: actor.userId,
      action: 'admin.customer.approved',
      entityType: 'CustomerProfile',
      entityId: profile.id,
      beforeState: { accountStatus: previousStatus },
      afterState: { accountStatus: AccountStatus.ACTIVE, approvedBy: actor.userId },
      requestMetadata: null,
    });

    await insertOutboxEvent(tx, {
      eventType: 'customer.approved',
      aggregateType: 'CustomerProfile',
      aggregateId: profile.id,
      payload: {
        customerProfileId: profile.id,
        userId: user.id,
        previousStatus,
        newStatus: AccountStatus.ACTIVE,
        approvedByAdminUserId: actor.userId,
        timestamp: approvedAt.toISOString(),
      },
    });
  });

  return {
    customerProfileId: profile.id,
    userId: user.id,
    previousStatus,
    newStatus: AccountStatus.ACTIVE,
    approvedAt: approvedAt.toISOString(),
    approvedByAdminUserId: actor.userId,
  };
}
