import 'server-only';
import { prisma, type Db } from '@/shared/database/prisma';
import type { Prisma } from '@prisma/client';
import { RedisLockService } from '@/shared/infrastructure/redis-lock-service';
import type { AuthenticatedPrincipal } from '@/modules/identity/domain/types';
import {
  restartBookingSearch,
  cancelBookingByOperator,
} from '@/modules/booking/application/dispatch-service';
import { updateOperationsDecisionStatus } from './operations-decision-service';

export interface ExecuteOperationsActionInput {
  actionId: string;
  decisionId: string;
  actionType: string;
  /**
   * The authenticated admin performing this action. RESTART_DISPATCH and
   * CANCEL_BOOKING delegate to dispatch-service.ts's own permission-checked,
   * state-machine-validated functions (see below), which require a full
   * principal, not just a user id.
   */
  actor: AuthenticatedPrincipal;
  bookingId?: string;
  incidentId?: string;
  driverId?: string;
  reason?: string;
}

export interface OperationsActionResult {
  success: boolean;
  actionId: string;
  decisionId: string;
  actionType: string;
  message: string;
  executedAt: Date;
  executedBy: string;
  details?: Record<string, unknown>;
}

/**
 * OperationsActionService executes authorized manual or automated actions
 * by invoking authoritative domain services.
 *
 * Idempotency has two layers now: RedisLockService still guards the short
 * window where two truly simultaneous requests could both be mid-flight
 * (its 15s TTL), but a duplicate/retried request arriving *after* that lock
 * has already been released — network retry, an operator double-clicking
 * after a slow response — is guarded by a durable
 * OperationsDecisionExecution row keyed on a unique
 * (decisionId, attemptNumber) pair and a unique idempotencyKey: the loser of
 * a race to create that row gets a benign "already in progress" result
 * instead of re-running the underlying domain action a second time. A
 * decision that's already RESOLVED/DISMISSED short-circuits before any of
 * this, for the same reason.
 */
export async function executeOperationsAction(
  input: ExecuteOperationsActionInput,
  db: Db = prisma,
): Promise<OperationsActionResult> {
  const { actionId, decisionId, actionType, actor, bookingId, incidentId, reason } = input;
  const adminUserId = actor.userId;
  const lockKey = `lock:ops-action:${decisionId}:${actionType}`;
  const now = new Date();

  const benignResult = (message: string): OperationsActionResult => ({
    success: true,
    actionId,
    decisionId,
    actionType,
    message,
    executedAt: now,
    executedBy: adminUserId,
    details: {},
  });

  // Acquire Redis lock to ensure concurrency safety
  const lockAcquired = await RedisLockService.acquireLock(lockKey, 15000);
  if (!lockAcquired) {
    throw new Error('Action execution is already in progress for this decision. Please wait.');
  }

  try {
    const decision = await db.operationsDecision.findUnique({ where: { id: decisionId } });
    if (!decision) {
      throw new Error(`Operations decision ${decisionId} not found.`);
    }
    if (decision.status === 'RESOLVED' || decision.status === 'DISMISSED') {
      return benignResult(
        `This decision is already ${decision.status.toLowerCase()}; no action was taken.`,
      );
    }

    const attemptNumber =
      (await db.operationsDecisionExecution.count({ where: { decisionId } })) + 1;
    const idempotencyKey = `ops-exec:${decisionId}:${attemptNumber}`;

    let execution;
    try {
      execution = await db.operationsDecisionExecution.create({
        data: {
          decisionId,
          actionId,
          actionType,
          attemptNumber,
          idempotencyKey,
          actorUserId: adminUserId,
          reason,
          status: 'PROCESSING',
        },
      });
    } catch {
      // Unique (decisionId, attemptNumber) or idempotencyKey collision — a
      // concurrent request already claimed this attempt slot.
      return benignResult('Another execution attempt for this decision is already in progress.');
    }

    let resultMessage = 'Action executed successfully.';
    const details: Record<string, unknown> = {};

    try {
      switch (actionType) {
        case 'RESTART_DISPATCH': {
          if (!bookingId) throw new Error('Booking ID is required for RESTART_DISPATCH action.');
          // Delegates to dispatch-service.ts's restartBookingSearch rather than
          // writing the booking row directly: that function is the single
          // place enforcing that a restart is only valid from EXPIRED (see its
          // own docstring) and that the driver-release/audit/outbox side
          // effects a real dispatch restart requires all happen atomically. A
          // raw `status: 'SEARCHING_DRIVER'` write here (the previous
          // implementation) would happily force ANY booking — including one
          // that is DRIVER_ASSIGNED, TRIP_IN_PROGRESS, or already
          // COMPLETED/CANCELLED — back into an active search, silently
          // discarding its real state.
          await restartBookingSearch(
            { bookingId, actor, reason: reason || 'Restarted via Operations Command Center' },
            db,
          );
          resultMessage = `Dispatch search restarted for booking ${bookingId}.`;
          details.bookingId = bookingId;
          break;
        }

        case 'CANCEL_BOOKING': {
          if (!bookingId) throw new Error('Booking ID is required for CANCEL_BOOKING action.');
          // Delegates to dispatch-service.ts's cancelBookingByOperator rather
          // than writing the booking row directly, for the same reason as
          // RESTART_DISPATCH above: that function is the single place enforcing
          // that only a non-terminal booking can be operator-cancelled, and
          // that cancelling one also releases its assigned driver, cancels
          // pending assignment attempts, and records the audit/outbox trail. A
          // raw `status: 'CANCELLED'` write here (the previous implementation)
          // could cancel a booking that is already TRIP_COMPLETED or already
          // CANCELLED, and would silently strand its assigned driver.
          await cancelBookingByOperator(
            { bookingId, actor, reason: reason || 'Cancelled by Operations Command' },
            db,
          );
          resultMessage = `Booking ${bookingId} cancelled by Operations Command.`;
          details.bookingId = bookingId;
          break;
        }

        case 'ESCALATE_INCIDENT': {
          if (!incidentId) throw new Error('Incident ID is required for ESCALATE_INCIDENT action.');
          if (db.tripReliabilityIncident) {
            await db.tripReliabilityIncident.update({
              where: { id: incidentId },
              data: { status: 'ESCALATED', updatedAt: now },
            });
          }
          resultMessage = `Reliability incident ${incidentId} escalated to emergency ops.`;
          details.incidentId = incidentId;
          break;
        }

        case 'RESOLVE_INCIDENT': {
          if (!incidentId) throw new Error('Incident ID is required for RESOLVE_INCIDENT action.');
          if (db.tripReliabilityIncident) {
            await db.tripReliabilityIncident.update({
              where: { id: incidentId },
              data: { status: 'RESOLVED', resolvedAt: now, updatedAt: now },
            });
          }
          resultMessage = `Reliability incident ${incidentId} marked as RESOLVED.`;
          details.incidentId = incidentId;
          break;
        }

        default: {
          resultMessage = `Operational observation action ${actionType} logged.`;
          break;
        }
      }
    } catch (err) {
      const failureSummary = err instanceof Error ? err.message : 'Unknown execution failure.';
      // Record the failure durably before propagating — the decision's own
      // status is deliberately left untouched (matches the prior
      // behavior of never reaching the RESOLVED update on this path), so
      // an operator can simply retry once the underlying issue is fixed.
      await db.operationsDecisionExecution.update({
        where: { id: execution.id },
        data: {
          status: 'FAILED',
          failureCode: 'EXECUTION_ERROR',
          failureSummary,
          completedAt: new Date(),
        },
      });
      throw err;
    }

    await db.operationsDecisionExecution.update({
      where: { id: execution.id },
      data: {
        status: 'SUCCEEDED',
        resultMessage,
        details: details as Prisma.InputJsonValue,
        completedAt: new Date(),
      },
    });

    // Update decision status to RESOLVED
    await updateOperationsDecisionStatus(decisionId, 'RESOLVED', adminUserId, db);

    return {
      success: true,
      actionId,
      decisionId,
      actionType,
      message: resultMessage,
      executedAt: now,
      executedBy: adminUserId,
      details,
    };
  } finally {
    await RedisLockService.releaseLock(lockKey);
  }
}
