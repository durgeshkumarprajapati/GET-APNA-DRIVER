import { prisma } from '@/shared/database/prisma';
import { DispatchRecoveryHandler } from './recovery/dispatch-recovery';
import { AssignmentRecoveryHandler } from './recovery/assignment-recovery';
import { NotificationRecoveryHandler } from './recovery/notification-recovery';
import { ReconciliationRecoveryHandler } from './recovery/reconciliation-recovery';
import { IncidentEscalationService } from './incident-escalation-service';
import { IncidentPolicyService } from './incident-policy-service';
import { IncidentNotificationService } from './incident-notification-service';
import { getTripReliabilityConfig } from './trip-reliability-config';
import type { RecoveryResult, IncidentStatus } from './trip-reliability-types';

const TERMINAL_INCIDENT_STATUSES: IncidentStatus[] = ['RESOLVED', 'CLOSED', 'DISMISSED'];
const TERMINAL_BOOKING_STATUSES = ['CANCELLED', 'TRIP_COMPLETED', 'EXPIRED'];

export interface ExecuteRecoveryOptions {
  /**
   * True when an admin operator explicitly triggered this retry from
   * /admin/incidents. A manual retry is operator-authorized, so it bypasses
   * the automatic retry-count ceiling and cooldown window that exist purely
   * to stop an unattended sweep from hammering the same failing action
   * every cycle — it still gets its own tracked attempt row either way.
   */
  isManualOverride?: boolean;
}

export class IncidentRecoveryService {
  private dispatchRecovery = new DispatchRecoveryHandler();
  private assignmentRecovery = new AssignmentRecoveryHandler();
  private notificationRecovery = new NotificationRecoveryHandler();
  private reconciliationRecovery = new ReconciliationRecoveryHandler();
  private escalationService = new IncidentEscalationService();
  private policyService = new IncidentPolicyService();
  private notificationService = new IncidentNotificationService();

  async executeRecovery(
    incidentId: string,
    actorUserId?: string | null,
    options?: ExecuteRecoveryOptions,
  ): Promise<RecoveryResult> {
    const incident = await prisma.tripReliabilityIncident.findUnique({
      where: { id: incidentId },
      include: { booking: { select: { id: true, status: true } } },
    });

    if (!incident) {
      return {
        success: false,
        actionTaken: 'INCIDENT_NOT_FOUND',
        notes: 'Incident does not exist.',
      };
    }

    if (TERMINAL_INCIDENT_STATUSES.includes(incident.status)) {
      return {
        success: true,
        actionTaken: 'ALREADY_RESOLVED',
        notes: 'Incident is already resolved, closed, or dismissed.',
      };
    }

    // A booking that has already reached a terminal state (cancelled,
    // completed, or its search expired) can no longer benefit from any
    // recovery action — restarting dispatch or requesting a driver
    // confirmation on a trip that is already over would be meaningless at
    // best and actively confusing at worst. Dismiss instead of escalating:
    // there is nothing for a human operator to act on either.
    if (TERMINAL_BOOKING_STATUSES.includes(incident.booking.status)) {
      return this.dismissForTerminalBooking(incidentId, incident.status, actorUserId);
    }

    const attemptNumber =
      (await prisma.tripReliabilityRecoveryAttempt.count({
        where: { incidentId },
      })) + 1;
    const policy = this.policyService.getPolicyForIncidentType(incident.type);
    const isManualOverride = options?.isManualOverride ?? false;

    // A type the policy marks ineligible for automated recovery (ESCALATE_ONLY
    // / NOTIFY_ONLY) never enters the retry-limit/cooldown machinery below —
    // those exist purely to throttle a *repeatedly retried automated fix*,
    // which doesn't apply here since there is no automated fix being
    // attempted. A manual admin override still bypasses this gate entirely
    // and falls through to the handler-dispatch switch, on the theory that
    // an operator explicitly clicking "Trigger Recovery" wants whatever
    // handler exists to actually run, not another policy-driven escalation.
    if (!isManualOverride && !policy.canAutoRecover) {
      if (policy.strategy === 'ESCALATE_ONLY') {
        await this.recordAttemptResult(
          incidentId,
          incident.bookingId,
          attemptNumber,
          'ESCALATED_PER_POLICY',
          actorUserId,
          true,
        );
        await this.escalationService.escalateIncident(
          incidentId,
          actorUserId,
          `${incident.type} requires operator review per recovery policy.`,
        );
        return {
          success: true,
          actionTaken: 'ESCALATED_PER_POLICY',
          notes: `${incident.type} is not eligible for automated recovery; escalated for operator review.`,
          escalated: true,
        };
      }

      // NOTIFY_ONLY: keep the incident open for now (a driver confirmation
      // or manual operator action may still resolve it) but make sure the
      // affected party has been told, without re-sending on every sweep tick.
      await this.notifyForIncident(incident);
      await this.recordAttemptResult(
        incidentId,
        incident.bookingId,
        attemptNumber,
        'NOTIFIED_PER_POLICY',
        actorUserId,
        true,
      );
      return {
        success: true,
        actionTaken: 'NOTIFIED_PER_POLICY',
        notes: `${incident.type} does not support automated recovery; affected parties notified.`,
      };
    }

    if (!isManualOverride) {
      if (attemptNumber > policy.maxAutoRetries) {
        await this.recordSkippedAttempt(
          incidentId,
          incident.bookingId,
          attemptNumber,
          'AUTO_RETRY_LIMIT_EXCEEDED',
        );
        await this.escalationService.escalateIncident(
          incidentId,
          null,
          `Automatic retry limit (${policy.maxAutoRetries}) exceeded for ${incident.type}.`,
        );
        return {
          success: false,
          actionTaken: 'AUTO_RETRY_LIMIT_EXCEEDED',
          notes: `Escalated after ${policy.maxAutoRetries} automatic recovery attempts.`,
          escalated: true,
        };
      }

      const cooldownActive = await this.isCooldownActive(incidentId);
      if (cooldownActive) {
        await this.recordSkippedAttempt(
          incidentId,
          incident.bookingId,
          attemptNumber,
          'COOLDOWN_ACTIVE',
        );
        return {
          success: true,
          actionTaken: 'COOLDOWN_ACTIVE',
          notes:
            'Recovery cooldown window has not elapsed since the last attempt; skipping this cycle.',
        };
      }
    }

    const idempotencyKey = `recovery:${incidentId}:${attemptNumber}`;
    let attempt;
    try {
      attempt = await prisma.tripReliabilityRecoveryAttempt.create({
        data: {
          incidentId,
          bookingId: incident.bookingId,
          action: policy.strategy,
          status: 'PROCESSING',
          attemptNumber,
          idempotencyKey,
          triggeredBy: actorUserId ? 'ADMIN' : 'SYSTEM',
          actorUserId,
        },
      });
    } catch {
      // Unique (incidentId, attemptNumber) collision — a concurrent sweep
      // or a second admin click already claimed this attempt slot.
      return {
        success: true,
        actionTaken: 'RECOVERY_ALREADY_IN_PROGRESS',
        notes: 'Another recovery attempt for this incident is already in progress.',
      };
    }

    // Explicit status transition: current -> RECOVERING
    const fromStatus = incident.status;
    const recoveringStatus: IncidentStatus = 'RECOVERING';

    await prisma.tripReliabilityIncident.update({
      where: { id: incidentId },
      data: { status: recoveringStatus },
    });

    await prisma.tripReliabilityTimeline.create({
      data: {
        incidentId,
        fromStatus,
        toStatus: recoveringStatus,
        action: 'RECOVERY_STARTED',
        actorUserId,
        actorRole: actorUserId ? 'ADMIN' : 'SYSTEM',
        notes: `Recovery attempt #${attemptNumber} initiated.`,
      },
    });

    let recoveryResult: RecoveryResult;

    switch (incident.type) {
      case 'ASSIGNMENT_TIMEOUT':
        recoveryResult = await this.assignmentRecovery.recoverAssignmentTimeout(incident.bookingId);
        break;

      case 'DRIVER_CANCELLED':
        recoveryResult = await this.assignmentRecovery.recoverDriverCancellation(
          incident.bookingId,
        );
        break;

      case 'DISPATCH_FAILURE':
      case 'SCHEDULED_RIDE_FAILURE':
        recoveryResult = await this.dispatchRecovery.recoverDispatchFailure(incident.bookingId);
        break;

      case 'INVOICE_FAILURE':
        recoveryResult = await this.reconciliationRecovery.recoverInvoiceFailure(
          incident.bookingId,
        );
        break;

      case 'PAYMENT_RECONCILIATION':
        recoveryResult = await this.reconciliationRecovery.recoverPaymentReconciliation(
          incident.bookingId,
        );
        break;

      case 'NOTIFICATION_FAILURE':
        recoveryResult = await this.notificationRecovery.recoverNotificationFailure(
          incident.customerId || '',
          'Trip Notification Retry',
          'Updated status notification',
        );
        break;

      default:
        recoveryResult = {
          success: false,
          actionTaken: 'NO_AUTOMATED_RECOVERY_POLICY',
          notes: `No automated recovery strategy for ${incident.type}. Requires manual operator review.`,
          escalated: true,
        };
        break;
    }

    await prisma.tripReliabilityRecoveryAttempt.update({
      where: { id: attempt.id },
      data: {
        status: recoveryResult.success ? 'SUCCEEDED' : 'FAILED',
        completedAt: new Date(),
        failureCode: recoveryResult.success ? null : recoveryResult.actionTaken,
        failureSummary: recoveryResult.success ? null : recoveryResult.notes,
      },
    });

    if (recoveryResult.success) {
      const resolvedStatus: IncidentStatus = 'RESOLVED';
      await prisma.tripReliabilityIncident.update({
        where: { id: incidentId },
        data: {
          status: resolvedStatus,
          resolvedAt: new Date(),
          resolutionCode: recoveryResult.actionTaken,
        },
      });

      await prisma.tripReliabilityTimeline.create({
        data: {
          incidentId,
          fromStatus: recoveringStatus,
          toStatus: resolvedStatus,
          action: 'RECOVERY_SUCCEEDED',
          actorUserId,
          actorRole: actorUserId ? 'ADMIN' : 'SYSTEM',
          notes: recoveryResult.notes,
        },
      });
    } else {
      await this.escalationService.escalateIncident(
        incidentId,
        actorUserId,
        recoveryResult.notes || 'Recovery attempt failed.',
      );
    }

    return recoveryResult;
  }

  private async isCooldownActive(incidentId: string): Promise<boolean> {
    const config = getTripReliabilityConfig();
    const lastAttempt = await prisma.tripReliabilityRecoveryAttempt.findFirst({
      where: { incidentId },
      orderBy: { startedAt: 'desc' },
    });
    if (!lastAttempt) return false;
    const elapsedMs = Date.now() - lastAttempt.startedAt.getTime();
    return elapsedMs < config.incidentCooldownSeconds * 1000;
  }

  private async recordSkippedAttempt(
    incidentId: string,
    bookingId: string,
    attemptNumber: number,
    failureCode: string,
  ): Promise<void> {
    try {
      await prisma.tripReliabilityRecoveryAttempt.create({
        data: {
          incidentId,
          bookingId,
          action: 'SKIPPED',
          status: 'CANCELLED',
          attemptNumber,
          idempotencyKey: `recovery:${incidentId}:${attemptNumber}`,
          triggeredBy: 'SYSTEM',
          failureCode,
          completedAt: new Date(),
        },
      });
    } catch {
      // Another caller already recorded this attempt slot — nothing to do.
    }
  }

  private async recordAttemptResult(
    incidentId: string,
    bookingId: string,
    attemptNumber: number,
    actionTaken: string,
    actorUserId: string | null | undefined,
    success: boolean,
  ): Promise<void> {
    try {
      await prisma.tripReliabilityRecoveryAttempt.create({
        data: {
          incidentId,
          bookingId,
          action: actionTaken,
          status: success ? 'SUCCEEDED' : 'FAILED',
          attemptNumber,
          idempotencyKey: `recovery:${incidentId}:${attemptNumber}`,
          triggeredBy: actorUserId ? 'ADMIN' : 'SYSTEM',
          actorUserId,
          completedAt: new Date(),
        },
      });
    } catch {
      // Concurrent caller already claimed this attempt slot.
    }
  }

  private async notifyForIncident(incident: {
    id: string;
    type: import('./trip-reliability-types').IncidentType;
    severity: import('./trip-reliability-types').IncidentSeverity;
    bookingId: string;
    customerId: string | null;
    driverProfileId: string | null;
  }): Promise<void> {
    if (incident.customerId) {
      await this.notificationService.notifyCustomerReliabilityEvent(
        incident.customerId,
        incident.bookingId,
        incident.type,
        incident.severity,
      );
    }
  }

  private async dismissForTerminalBooking(
    incidentId: string,
    fromStatus: IncidentStatus,
    actorUserId?: string | null,
  ): Promise<RecoveryResult> {
    const toStatus: IncidentStatus = 'DISMISSED';
    await prisma.tripReliabilityIncident.update({
      where: { id: incidentId },
      data: { status: toStatus, resolvedAt: new Date(), resolutionCode: 'BOOKING_TERMINAL' },
    });
    await prisma.tripReliabilityTimeline.create({
      data: {
        incidentId,
        fromStatus,
        toStatus,
        action: 'INCIDENT_DISMISSED_BOOKING_TERMINAL',
        actorUserId,
        actorRole: actorUserId ? 'ADMIN' : 'SYSTEM',
        notes: 'Booking reached a terminal state; recovery is no longer applicable.',
      },
    });
    return {
      success: true,
      actionTaken: 'DISMISSED_BOOKING_TERMINAL',
      notes: 'Booking has already reached a terminal state; incident dismissed without recovery.',
    };
  }
}
