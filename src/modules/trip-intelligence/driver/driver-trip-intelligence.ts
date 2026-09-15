import { prisma } from '@/shared/database/prisma';
import { getDriverBookingLocationTelemetry } from '@/modules/location/application/booking-location-service';
import { TripSignalService } from '../trip-signal-service';
import { TripRiskService } from '../trip-risk-service';
import { TripRecommendationService } from '../trip-recommendation-service';
import { TripEventService } from '../trip-event-service';
import type { TripIntelligenceResult } from '../trip-intelligence-types';

export class DriverTripIntelligence {
  private signalService = new TripSignalService();
  private riskService = new TripRiskService();
  private recommendationService = new TripRecommendationService();
  private eventService = new TripEventService();

  async getDriverTripIntelligence(userId: string, bookingId: string): Promise<TripIntelligenceResult | null> {
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
        pickupAddress: true,
        pickupLatitude: true,
        pickupLongitude: true,
        dropoffAddress: true,
        dropoffLatitude: true,
        dropoffLongitude: true,
        driverEnRouteAt: true,
        driverArrivedAt: true,
        tripStartedAt: true,
        tripCompletedAt: true,
        finalFareAmount: true,
      },
    });

    if (!booking) return null;

    const activeSafetyIncident = await prisma.safetyIncident.findFirst({
      where: { bookingId, status: { in: ['OPEN', 'ACKNOWLEDGED', 'INVESTIGATING', 'ESCALATED'] } },
    });

    const telemetry = await getDriverBookingLocationTelemetry(userId, bookingId);

    const extraction = this.signalService.extractSignal({
      status: booking.status,
      pickupLatitude: booking.pickupLatitude,
      pickupLongitude: booking.pickupLongitude,
      dropoffLatitude: booking.dropoffLatitude,
      dropoffLongitude: booking.dropoffLongitude,
      driverEnRouteAt: booking.driverEnRouteAt,
      driverArrivedAt: booking.driverArrivedAt,
      tripStartedAt: booking.tripStartedAt,
      tripCompletedAt: booking.tripCompletedAt,
      driverTelemetry: telemetry?.driverLocation ? {
        latitude: telemetry.driverLocation.latitude,
        longitude: telemetry.driverLocation.longitude,
        capturedAt: telemetry.driverLocation.capturedAt,
      } : null,

      activeSafetyIncident: Boolean(activeSafetyIncident),
    });

    const confidence = this.riskService.evaluateConfidence(extraction.freshness, extraction.signalType);

    const actions = this.recommendationService.generateActions({
      role: 'DRIVER',
      signalType: extraction.signalType,
      bookingId,
      pickupAddress: booking.pickupAddress,
      pickupLatitude: booking.pickupLatitude,
      pickupLongitude: booking.pickupLongitude,
      dropoffAddress: booking.dropoffAddress || undefined,
      driverLatitude: booking.pickupLatitude,
      driverLongitude: booking.pickupLongitude,
      freshness: extraction.freshness,
    });

    await this.eventService.recordIntelligenceEvent({
      bookingId,
      userId,
      actorRole: 'DRIVER',
      signalType: extraction.signalType,
      confidence,
    });

    const title = this.formatSignalTitle(extraction.signalType);
    const explanation = this.formatSignalExplanation(extraction.signalType, extraction.distanceMeters);

    return {
      bookingId,
      signalType: extraction.signalType,
      title,
      explanation,
      freshness: extraction.freshness,
      confidence,
      distanceMeters: extraction.distanceMeters,
      actions,
    };
  }

  private formatSignalTitle(signalType: string): string {
    switch (signalType) {
      case 'SAFETY_REQUIRED': return 'Emergency Safety Alert Active';
      case 'DRIVER_ARRIVED': return 'Arrived At Pickup Point';
      case 'DRIVER_NEAR_PICKUP': return 'Pickup Point Approaching';
      case 'TRIP_PROGRESS': return 'Trip In Progress';
      case 'DESTINATION_NEAR': return 'Destination Approaching';
      case 'TRIP_COMPLETED': return 'Trip Completed';
      default: return 'Booking Assigned';
    }
  }

  private formatSignalExplanation(signalType: string, distanceMeters?: number): string {
    switch (signalType) {
      case 'SAFETY_REQUIRED': return 'Emergency alert active. Follow safety guidelines.';
      case 'DRIVER_ARRIVED': return 'You have arrived at customer pickup. Verify ride PIN when customer enters.';
      case 'DRIVER_NEAR_PICKUP': return `Customer pickup point is approximately ${distanceMeters || 350}m away.`;
      case 'DESTINATION_NEAR': return 'Customer dropoff destination is nearby.';
      case 'TRIP_COMPLETED': return 'Trip completed successfully. Review earnings and incentive progress below.';
      default: return 'Booking is assigned. Tap View Pickup to see pickup location.';
    }
  }
}
