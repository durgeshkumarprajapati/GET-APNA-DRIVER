import { prisma } from '@/shared/database/prisma';
import { IncidentContextService } from './incident-context-service';
import { IncidentDetectionService } from './incident-detection-service';
import { IncidentRecoveryService } from './incident-recovery-service';
import { IncidentEscalationService } from './incident-escalation-service';
import { getTripReliabilityConfig } from './trip-reliability-config';
import type { CustomerReliabilityView, DriverReliabilityView } from './trip-reliability-types';

export class TripReliabilityService {
  private contextService = new IncidentContextService();
  private detectionService = new IncidentDetectionService();
  private recoveryService = new IncidentRecoveryService();
  private escalationService = new IncidentEscalationService();

  async getCustomerReliabilityView(customerId: string, bookingId: string): Promise<CustomerReliabilityView | null> {
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
      finalFareAmount: context.booking.finalFareAmount ? Number(context.booking.finalFareAmount) : null,
      hasTaxInvoice: context.paymentState.hasTaxInvoice,
    });

    const activeIncident = await prisma.tripReliabilityIncident.findFirst({
      where: { bookingId, status: { in: ['DETECTED', 'INVESTIGATING', 'CONFIRMED', 'RECOVERY_PENDING', 'RECOVERING', 'ESCALATED'] } },
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
        statusExplanation = "Your assigned driver is unavailable. We're searching for another verified driver.";
        recommendedAction = { type: 'VIEW_MAP', label: 'View Trip' };
        break;

      case 'DRIVER_LOCATION_STALE':
        statusTitle = 'Location Signal Stale';
        statusExplanation = "We haven't received a recent location update from your driver. Your trip remains active.";
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
        statusExplanation = 'Your driver is experiencing traffic delays en route to your pickup point.';
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

  async getDriverReliabilityView(userId: string, bookingId: string): Promise<DriverReliabilityView | null> {
    const driverProfile = await prisma.driverProfile.findUnique({
      where: { userId },
      select: { id: true },
    });

    if (!driverProfile) return null;

    const booking = await prisma.booking.findFirst({
      where: { id: bookingId, driverProfileId: driverProfile.id },
      select: { id: true, status: true, customerId: true, pickupLatitude: true, pickupLongitude: true },
    });

    if (!booking) return null;

    const activeIncident = await prisma.tripReliabilityIncident.findFirst({
      where: { bookingId, status: { in: ['DETECTED', 'INVESTIGATING', 'CONFIRMED', 'RECOVERY_PENDING', 'RECOVERING', 'ESCALATED'] } },
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

  async triggerAutomatedRecovery(incidentId: string, actorUserId?: string | null) {
    return this.recoveryService.executeRecovery(incidentId, actorUserId);
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
}
