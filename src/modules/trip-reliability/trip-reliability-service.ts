import { prisma } from '@/shared/database/prisma';
import { ForbiddenError, NotFoundError } from '@/shared/errors/app-error';
import { realtime } from '@/shared/realtime/realtime-provider';
import type { DriverConfirmationResponse } from '@prisma/client';
import { IncidentContextService } from './incident-context-service';
import { IncidentDetectionService } from './incident-detection-service';
import { IncidentRecoveryService } from './incident-recovery-service';
import { IncidentEscalationService } from './incident-escalation-service';
import { IncidentNotificationService } from './incident-notification-service';
import { getTripReliabilityConfig } from './trip-reliability-config';
import type { CustomerReliabilityView, DriverReliabilityView } from './trip-reliability-types';

const TERMINAL_INCIDENT_STATUSES = ['RESOLVED', 'CLOSED', 'DISMISSED'] as const;

export class TripReliabilityService {
  private contextService = new IncidentContextService();
  private detectionService = new IncidentDetectionService();
  private recoveryService = new IncidentRecoveryService();
  private escalationService = new IncidentEscalationService();
  private notificationService = new IncidentNotificationService();

  async getCustomerReliabilityView(
    customerId: string,
    bookingId: string,
  ): Promise<CustomerReliabilityView | null> {
    const context = await this.contextService.assembleContext(bookingId);
    if (!context || context.booking.customerId !== customerId) {
      return null;
    }

    const config = getTripReliabilityConfig();
    if (!config.enabled || !config.customerEnabled) {
      return {
        bookingId,
        hasActiveIncident: false,
        statusTitle: 'Trip In Progress',
        statusExplanation: 'Your trip is operating under standard monitoring.',
      };
    }

    // Evaluate detection
    const activeSafety = await prisma.safetyIncident.findFirst({
      where: { bookingId, status: { in: ['OPEN', 'ACKNOWLEDGED', 'INVESTIGATING', 'ESCALATED'] } },
    });

    await this.detectionService.evaluateBookingReliability({
      bookingId,
      status: context.booking.status,
      customerId,
      driverProfileId: context.booking.driverProfileId,
      createdAt: context.booking.createdAt,
      updatedAt: context.booking.updatedAt,
      driverEnRouteAt: context.booking.driverEnRouteAt,
      driverArrivedAt: context.booking.driverArrivedAt,
      tripStartedAt: context.booking.tripStartedAt,
      tripCompletedAt: context.booking.tripCompletedAt,
      latestTelemetryCapturedAt: context.telemetry?.driverLocation?.capturedAt
        ? new Date(context.telemetry.driverLocation.capturedAt)
        : null,
      driverLatitude: context.telemetry?.driverLocation?.latitude,
      driverLongitude: context.telemetry?.driverLocation?.longitude,
      pickupLatitude: context.booking.pickupLatitude,
      pickupLongitude: context.booking.pickupLongitude,
      activeSafetyIncident: Boolean(activeSafety),
      paymentCaptured: context.paymentState.paymentCaptured,
      finalFareAmount: context.booking.finalFareAmount
        ? Number(context.booking.finalFareAmount)
        : null,
      hasTaxInvoice: context.paymentState.hasTaxInvoice,
    });

    const activeIncident = await prisma.tripReliabilityIncident.findFirst({
      where: {
        bookingId,
        status: {
          in: [
            'DETECTED',
            'INVESTIGATING',
            'CONFIRMED',
            'RECOVERY_PENDING',
            'RECOVERING',
            'ESCALATED',
          ],
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!activeIncident) {
      return {
        bookingId,
        hasActiveIncident: false,
        statusTitle: 'Live Monitoring Active',
        statusExplanation: 'Trip operational status normal.',
        lastKnownLocation: context.telemetry?.driverLocation
          ? {
              latitude: context.telemetry.driverLocation.latitude,
              longitude: context.telemetry.driverLocation.longitude,
              freshness: 'LIVE',
            }
          : undefined,
      };
    }

    let statusTitle = 'Operational Notice';
    let statusExplanation = 'We are actively monitoring your ride.';
    let recommendedAction: CustomerReliabilityView['recommendedAction'] = {
      type: 'CONTACT_SUPPORT',
      label: 'Contact Support',
    };

    switch (activeIncident.type) {
      case 'DRIVER_CANCELLED':
      case 'ASSIGNMENT_TIMEOUT':
      case 'DISPATCH_FAILURE':
        statusTitle = 'Finding Your Driver';
        statusExplanation =
          "Your assigned driver is unavailable. We're searching for another verified driver.";
        recommendedAction = { type: 'VIEW_MAP', label: 'View Trip' };
        break;

      case 'DRIVER_LOCATION_STALE':
        statusTitle = 'Location Signal Stale';
        statusExplanation =
          "We haven't received a recent location update from your driver. Your trip remains active.";
        recommendedAction = {
          type: 'VIEW_MAP',
          label: 'View Last Known Location',
          payload: context.telemetry?.driverLocation
            ? {
                latitude: context.telemetry.driverLocation.latitude,
                longitude: context.telemetry.driverLocation.longitude,
              }
            : undefined,
        };
        break;

      case 'PICKUP_DELAY':
        statusTitle = 'Pickup Route Delay';
        statusExplanation =
          'Your driver is experiencing traffic delays en route to your pickup point.';
        recommendedAction = { type: 'CALL_DRIVER', label: 'Call Driver' };
        break;

      case 'SAFETY_ESCALATION':
        statusTitle = 'Safety Priority Active';
        statusExplanation = 'Emergency safety dispatch is reviewing your trip status.';
        recommendedAction = { type: 'CONTACT_SUPPORT', label: 'Emergency Support' };
        break;
    }

    return {
      bookingId,
      hasActiveIncident: true,
      incidentId: activeIncident.id,
      incidentType: activeIncident.type,
      severity: activeIncident.severity,
      statusTitle,
      statusExplanation,
      recommendedAction,
      lastKnownLocation: context.telemetry?.driverLocation
        ? {
            latitude: context.telemetry.driverLocation.latitude,
            longitude: context.telemetry.driverLocation.longitude,
            freshness: 'RECENT',
          }
        : undefined,
    };
  }

  async getDriverReliabilityView(
    userId: string,
    bookingId: string,
  ): Promise<DriverReliabilityView | null> {
    const driverProfile = await prisma.driverProfile.findUnique({
      where: { userId },
      select: { id: true },
    });

    if (!driverProfile) return null;

    const booking = await prisma.booking.findFirst({
      where: { id: bookingId, driverProfileId: driverProfile.id },
      select: {
        id: true,
        status: true,
        customerId: true,
        pickupLatitude: true,
        pickupLongitude: true,
      },
    });

    if (!booking) return null;

    const activeIncident = await prisma.tripReliabilityIncident.findFirst({
      where: {
        bookingId,
        status: {
          in: [
            'DETECTED',
            'INVESTIGATING',
            'CONFIRMED',
            'RECOVERY_PENDING',
            'RECOVERING',
            'ESCALATED',
          ],
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!activeIncident) {
      return {
        bookingId,
        hasActiveIncident: false,
        statusTitle: 'Pickup Assistant Active',
        statusExplanation: 'Pickup navigation operating normally.',
      };
    }

    return {
      bookingId,
      hasActiveIncident: true,
      incidentId: activeIncident.id,
      incidentType: activeIncident.type,
      severity: activeIncident.severity,
      statusTitle: 'Pickup Operational Notice',
      statusExplanation: `Incident signal ${activeIncident.type} active. Follow standard pickup guidelines.`,
      recommendedAction: {
        type: 'VIEW_PICKUP',
        label: 'View Pickup Map',
        payload: {
          latitude: booking.pickupLatitude,
          longitude: booking.pickupLongitude,
        },
      },
    };
  }

  async triggerAutomatedRecovery(
    incidentId: string,
    actorUserId?: string | null,
    options?: { isManualOverride?: boolean },
  ) {
    return this.recoveryService.executeRecovery(incidentId, actorUserId, options);
  }

  async escalateIncident(incidentId: string, actorUserId?: string | null, reason?: string) {
    return this.escalationService.escalateIncident(incidentId, actorUserId, reason);
  }

  async resolveIncident(incidentId: string, actorUserId?: string | null, notes?: string) {
    const incident = await prisma.tripReliabilityIncident.findUnique({
      where: { id: incidentId },
    });

    if (!incident) return null;

    const fromStatus = incident.status;
    const toStatus = 'RESOLVED' as const;

    const updated = await prisma.tripReliabilityIncident.update({
      where: { id: incidentId },
      data: {
        status: toStatus,
        resolvedAt: new Date(),
        resolutionCode: 'MANUAL_RESOLUTION',
      },
    });

    await prisma.tripReliabilityTimeline.create({
      data: {
        incidentId,
        fromStatus,
        toStatus,
        action: 'INCIDENT_RESOLVED',
        actorUserId,
        actorRole: actorUserId ? 'ADMIN' : 'SYSTEM',
        notes: notes || 'Incident marked resolved by operator.',
      },
    });

    return updated;
  }

  /** Operator marks an incident a false positive, with a required reason for the audit trail. */
  async dismissIncident(incidentId: string, actorUserId: string | null, reason: string) {
    const incident = await prisma.tripReliabilityIncident.findUnique({
      where: { id: incidentId },
    });

    if (!incident) return null;

    const fromStatus = incident.status;
    const toStatus = 'DISMISSED' as const;

    const updated = await prisma.tripReliabilityIncident.update({
      where: { id: incidentId },
      data: {
        status: toStatus,
        resolvedAt: new Date(),
        resolutionCode: 'DISMISSED_FALSE_POSITIVE',
      },
    });

    await prisma.tripReliabilityTimeline.create({
      data: {
        incidentId,
        fromStatus,
        toStatus,
        action: 'INCIDENT_DISMISSED_FALSE_POSITIVE',
        actorUserId,
        actorRole: actorUserId ? 'ADMIN' : 'SYSTEM',
        notes: reason,
      },
    });

    return updated;
  }

  /**
   * Records the assigned driver's response to a reliability check
   * ("still travelling" / "arrived" / "temporarily delayed" / "unable to
   * continue"). This never sets the booking's own status directly — it
   * only feeds the incident/escalation flow, exactly like every other
   * recovery action. ARRIVED/STILL_TRAVELLING resolve the incident (the
   * driver's own Mark Arrived / Start Trip buttons still drive the real
   * booking transition); UNABLE_TO_CONTINUE escalates for operator
   * intervention; TEMPORARILY_DELAYED just acknowledges without forcing a
   * status change, giving recovery/escalation more time.
   */
  async recordDriverConfirmation(
    driverUserId: string,
    incidentId: string,
    response: DriverConfirmationResponse,
    expectedBookingId?: string,
  ): Promise<{ incidentStatus: string; actionTaken: string }> {
    const driverProfile = await prisma.driverProfile.findUnique({
      where: { userId: driverUserId },
      select: { id: true },
    });
    if (!driverProfile) {
      throw new ForbiddenError('No driver profile found for this account.');
    }

    const incident = await prisma.tripReliabilityIncident.findUnique({
      where: { id: incidentId },
      include: { booking: { select: { id: true, driverProfileId: true } } },
    });
    if (!incident) {
      throw new NotFoundError('Incident not found.');
    }
    if (incident.booking.driverProfileId !== driverProfile.id) {
      throw new ForbiddenError('You are not the assigned driver for this incident.');
    }
    if (expectedBookingId && incident.bookingId !== expectedBookingId) {
      throw new ForbiddenError('This incident does not belong to the specified booking.');
    }

    if (
      TERMINAL_INCIDENT_STATUSES.includes(
        incident.status as (typeof TERMINAL_INCIDENT_STATUSES)[number],
      )
    ) {
      // Already settled — a benign no-op rather than an error, so a driver
      // double-tapping the confirm button before the UI disables it never
      // sees a scary failure.
      return { incidentStatus: incident.status, actionTaken: 'ALREADY_RESOLVED' };
    }

    const attemptNumber =
      (await prisma.tripReliabilityRecoveryAttempt.count({ where: { incidentId } })) + 1;

    try {
      await prisma.tripReliabilityRecoveryAttempt.create({
        data: {
          incidentId,
          bookingId: incident.bookingId,
          action: 'DRIVER_CONFIRMATION',
          status: 'SUCCEEDED',
          attemptNumber,
          idempotencyKey: `recovery:${incidentId}:${attemptNumber}`,
          triggeredBy: 'DRIVER',
          actorUserId: driverUserId,
          driverResponse: response,
          completedAt: new Date(),
        },
      });
    } catch {
      // A concurrent duplicate submission (double-tap) already claimed this
      // attempt slot — the first submission already recorded the response.
      const current = await prisma.tripReliabilityIncident.findUnique({
        where: { id: incidentId },
        select: { status: true },
      });
      return {
        incidentStatus: current?.status ?? incident.status,
        actionTaken: 'ALREADY_RECORDED',
      };
    }

    let actionTaken: string;
    if (response === 'ARRIVED' || response === 'STILL_TRAVELLING') {
      const fromStatus = incident.status;
      const toStatus = 'RESOLVED' as const;
      await prisma.tripReliabilityIncident.update({
        where: { id: incidentId },
        data: {
          status: toStatus,
          resolvedAt: new Date(),
          resolutionCode: 'DRIVER_CONFIRMED_ON_TRACK',
        },
      });
      await prisma.tripReliabilityTimeline.create({
        data: {
          incidentId,
          fromStatus,
          toStatus,
          action: 'DRIVER_CONFIRMED_ON_TRACK',
          actorUserId: driverUserId,
          actorRole: 'DRIVER',
          notes: `Driver responded: ${response}.`,
        },
      });
      actionTaken = 'RESOLVED';
    } else if (response === 'UNABLE_TO_CONTINUE') {
      await this.escalationService.escalateIncident(
        incidentId,
        driverUserId,
        'Driver reported unable to continue.',
      );
      actionTaken = 'ESCALATED';
    } else {
      await prisma.tripReliabilityTimeline.create({
        data: {
          incidentId,
          action: 'DRIVER_ACKNOWLEDGED_DELAY',
          actorUserId: driverUserId,
          actorRole: 'DRIVER',
          notes: `Driver responded: ${response}.`,
        },
      });
      actionTaken = 'ACKNOWLEDGED';
    }

    if (incident.customerId) {
      await this.notificationService.notifyCustomerReliabilityEvent(
        incident.customerId,
        incident.bookingId,
        incident.type,
        incident.severity,
      );
    }

    realtime.publishBookingUpdate(incident.bookingId, 'trip_reliability.driver_confirmed', {
      incidentId,
      response,
      actionTaken,
    });

    const refreshed = await prisma.tripReliabilityIncident.findUnique({
      where: { id: incidentId },
      select: { status: true },
    });
    return { incidentStatus: refreshed?.status ?? incident.status, actionTaken };
  }
}
