import { prisma } from '@/shared/database/prisma';
import { evaluateAssignmentTimeout } from './rules/assignment-timeout-rule';
import { evaluateDispatchFailure } from './rules/dispatch-failure-rule';
import { evaluateLocationStale } from './rules/location-stale-rule';
import { evaluatePickupDelay } from './rules/pickup-delay-rule';
import { evaluateStuckTrip } from './rules/stuck-trip-rule';
import { evaluateCustomerUnreachable } from './rules/customer-unreachable-rule';
import { evaluateDriverCancellation } from './rules/driver-cancellation-rule';
import { evaluateScheduledRideFailure } from './rules/scheduled-ride-failure-rule';
import { evaluatePaymentReconciliation } from './rules/payment-reconciliation-rule';
import { evaluateNotificationFailure } from './rules/notification-failure-rule';
import { IncidentClassificationService } from './incident-classification-service';
import { IncidentEventService } from './incident-event-service';
import { IncidentNotificationService } from './incident-notification-service';
import type { RuleEvaluationInput } from './trip-reliability-types';

/** Non-terminal statuses — an incident in one of these is still the "same unresolved condition". */
const ACTIVE_INCIDENT_STATUSES = [
  'DETECTED',
  'INVESTIGATING',
  'CONFIRMED',
  'RECOVERY_PENDING',
  'RECOVERING',
  'ESCALATED',
] as const;

export class IncidentDetectionService {
  private classificationService = new IncidentClassificationService();
  private eventService = new IncidentEventService();
  private notificationService = new IncidentNotificationService();

  async evaluateBookingReliability(input: RuleEvaluationInput) {
    const rules = [
      evaluateAssignmentTimeout,
      evaluateDispatchFailure,
      evaluateLocationStale,
      evaluatePickupDelay,
      evaluateStuckTrip,
      evaluateCustomerUnreachable,
      evaluateDriverCancellation,
      evaluateScheduledRideFailure,
      evaluatePaymentReconciliation,
      evaluateNotificationFailure,
    ];

    for (const rule of rules) {
      const evaluation = rule(input);
      if (evaluation && evaluation.detected) {
        // The rules above re-detect the same ongoing condition every time
        // this is evaluated (e.g. once per proactive sweep tick, or once
        // per customer/driver page poll) — the fingerprint's 1-minute
        // dedup bucket only prevents a collision within that same minute,
        // not a fresh incident row every time this function is called
        // again a minute later while the underlying problem persists. An
        // already-active incident of this exact type is that same
        // unresolved condition, so it is returned as-is instead of minting
        // a new incident number and resetting recovery-attempt history.
        const existingActive = await prisma.tripReliabilityIncident.findFirst({
          where: {
            bookingId: input.bookingId,
            type: evaluation.type,
            status: { in: [...ACTIVE_INCIDENT_STATUSES] },
          },
          orderBy: { createdAt: 'desc' },
        });
        if (existingActive) {
          return existingActive;
        }

        const { severity, confidence } = this.classificationService.classifyIncident(
          evaluation.type,
          input.activeSafetyIncident,
        );

        const incident = await this.eventService.recordIncident({
          bookingId: input.bookingId,
          customerId: input.customerId,
          driverProfileId: input.driverProfileId,
          type: evaluation.type,
          severity,
          confidence,
          metadata: evaluation.metadata,
        });

        // Trigger contextual notification if customer/driver ID present
        if (input.customerId) {
          await this.notificationService.notifyCustomerReliabilityEvent(
            input.customerId,
            input.bookingId,
            evaluation.type,
            severity,
          );
        }

        if (input.driverId) {
          await this.notificationService.notifyDriverReliabilityEvent(
            input.driverId,
            input.bookingId,
            evaluation.type,
          );
        }

        return incident;
      }
    }

    return null;
  }
}
