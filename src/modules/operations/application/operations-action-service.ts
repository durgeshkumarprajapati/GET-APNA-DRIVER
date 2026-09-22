import 'server-only';
import { prisma, type Db } from '@/shared/database/prisma';
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
 * by invoking authoritative domain services. Uses RedisLockService to prevent
 * concurrent execution by multiple operators or workers.
 */
export async function executeOperationsAction(
  input: ExecuteOperationsActionInput,
  db: Db = prisma,
): Promise<OperationsActionResult> {
  const { actionId, decisionId, actionType, actor, bookingId, incidentId, reason } = input;
  const adminUserId = actor.userId;
  const lockKey = `lock:ops-action:${decisionId}:${actionType}`;
  const now = new Date();

  // Acquire Redis lock to ensure concurrency safety
  const lockAcquired = await RedisLockService.acquireLock(lockKey, 15000);
  if (!lockAcquired) {
    throw new Error('Action execution is already in progress for this decision. Please wait.');
  }

  try {
    let resultMessage = 'Action executed successfully.';
    const details: Record<string, unknown> = {};

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

    // Update decision status to RESOLVED
    await updateOperationsDecisionStatus(decisionId, 'RESOLVED', adminUserId);

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
