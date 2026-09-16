import { prisma } from '@/shared/database/prisma';
import { DispatchRecoveryHandler } from './recovery/dispatch-recovery';
import { AssignmentRecoveryHandler } from './recovery/assignment-recovery';
import { NotificationRecoveryHandler } from './recovery/notification-recovery';
import { ReconciliationRecoveryHandler } from './recovery/reconciliation-recovery';
import { IncidentEscalationService } from './incident-escalation-service';
import type { RecoveryResult, IncidentStatus } from './trip-reliability-types';

export class IncidentRecoveryService {
  private dispatchRecovery = new DispatchRecoveryHandler();
  private assignmentRecovery = new AssignmentRecoveryHandler();
  private notificationRecovery = new NotificationRecoveryHandler();
  private reconciliationRecovery = new ReconciliationRecoveryHandler();
  private escalationService = new IncidentEscalationService();

  async executeRecovery(incidentId: string, actorUserId?: string | null): Promise<RecoveryResult> {
    const incident = await prisma.tripReliabilityIncident.findUnique({
      where: { id: incidentId },
      include: { booking: true },
    });

    if (!incident) {
      return {
        success: false,
        actionTaken: 'INCIDENT_NOT_FOUND',
        notes: 'Incident does not exist.',
      };
    }

    if (incident.status === 'RESOLVED' || incident.status === 'CLOSED') {
      return {
        success: true,
        actionTaken: 'ALREADY_RESOLVED',
        notes: 'Incident is already resolved or closed.',
      };
    }

    // Explicit status transition: INVESTIGATING -> RECOVERING
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
        notes: 'Automated/Manual recovery execution initiated.',
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
}
