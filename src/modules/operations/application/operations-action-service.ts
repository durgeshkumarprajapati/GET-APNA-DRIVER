import 'server-only';
import { prisma, type Db } from '@/shared/database/prisma';
import { RedisLockService } from '@/shared/infrastructure/redis-lock-service';
import { updateOperationsDecisionStatus } from './operations-decision-service';

export interface ExecuteOperationsActionInput {
  actionId: string;
  decisionId: string;
  actionType: string;
  adminUserId: string;
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
  const { actionId, decisionId, actionType, adminUserId, bookingId, incidentId, reason } = input;
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
        // Update booking status back to SEARCHING_DRIVER
        await db.booking.update({
          where: { id: bookingId },
          data: { status: 'SEARCHING_DRIVER', updatedAt: now },
        });
        resultMessage = `Dispatch search restarted for booking ${bookingId}.`;
        details.bookingId = bookingId;
        break;
      }

      case 'CANCEL_BOOKING': {
        if (!bookingId) throw new Error('Booking ID is required for CANCEL_BOOKING action.');
        await db.booking.update({
          where: { id: bookingId },
          data: {
            status: 'CANCELLED',
            cancellationReason: reason || 'Cancelled by Operations Command',
            updatedAt: now,
          },
        });
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
