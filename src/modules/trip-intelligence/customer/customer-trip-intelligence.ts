import { prisma } from '@/shared/database/prisma';
import { getCustomerBookingLocationTelemetry } from '@/modules/location/application/booking-location-service';
import { TripSignalService } from '../trip-signal-service';
import { TripRiskService } from '../trip-risk-service';
import { TripRecommendationService } from '../trip-recommendation-service';
import { TripEventService } from '../trip-event-service';
import type { TripIntelligenceResult } from '../trip-intelligence-types';

export class CustomerTripIntelligence {
  private signalService = new TripSignalService();
  private riskService = new TripRiskService();
  private recommendationService = new TripRecommendationService();
  private eventService = new TripEventService();

  async getCustomerTripIntelligence(userId: string, bookingId: string): Promise<TripIntelligenceResult | null> {
    const booking = await prisma.booking.findFirst({
      where: { id: bookingId, customerId: userId },
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

    // Check safety incident
    const activeSafetyIncident = await prisma.safetyIncident.findFirst({
      where: { bookingId, status: { in: ['OPEN', 'ACKNOWLEDGED', 'INVESTIGATING', 'ESCALATED'] } },
    });

    // Location telemetry from Phase 43
    const telemetry = await getCustomerBookingLocationTelemetry(userId, bookingId);

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
      role: 'CUSTOMER',
      signalType: extraction.signalType,
      bookingId,
      pickupAddress: booking.pickupAddress,
      pickupLatitude: booking.pickupLatitude,
      pickupLongitude: booking.pickupLongitude,
      dropoffAddress: booking.dropoffAddress || undefined,
      driverLatitude: telemetry?.driverLocation?.latitude,
      driverLongitude: telemetry?.driverLocation?.longitude,
      finalFare: booking.finalFareAmount ? Number(booking.finalFareAmount) : 450,
      earnedPoints: 45,
      freshness: extraction.freshness,
    });

    // Record deduplicated event
    await this.eventService.recordIntelligenceEvent({
      bookingId,
      userId,
      actorRole: 'CUSTOMER',
      signalType: extraction.signalType,
      confidence,
    });

    const title = this.formatSignalTitle(extraction.signalType);
    const explanation = this.formatSignalExplanation(extraction.signalType, extraction.freshness, extraction.freshnessSeconds, extraction.distanceMeters);

    return {
      bookingId,
      signalType: extraction.signalType,
      title,
      explanation,
      freshness: extraction.freshness,
      freshnessSeconds: extraction.freshnessSeconds,
      confidence,
      distanceMeters: extraction.distanceMeters,
      actions,
    };
  }

  private formatSignalTitle(signalType: string): string {
    switch (signalType) {
      case 'SAFETY_REQUIRED': return 'Emergency Safety Alert Active';
      case 'DRIVER_ARRIVED': return 'Driver Has Arrived';
      case 'DRIVER_NEAR_PICKUP': return 'Driver Is Approaching Pickup';
      case 'DRIVER_EN_ROUTE': return 'Driver En Route To Pickup';
      case 'TRIP_DELAY_RISK': return 'Trip Update Delay';
      case 'TRIP_PROGRESS': return 'Trip In Progress';
      case 'DESTINATION_NEAR': return 'Approaching Destination';
      case 'TRIP_COMPLETED': return 'Trip Completed';
      default: return 'Driver Assigned';
    }
  }

  private formatSignalExplanation(signalType: string, freshness: string, seconds: number, distanceMeters?: number): string {
    const freshnessText = freshness === 'LIVE' ? 'Location updated live' : freshness === 'UNAVAILABLE' ? 'Location data unavailable' : `Location updated ${seconds}s ago`;

    switch (signalType) {
      case 'SAFETY_REQUIRED': return 'A safety alert is active on this trip. Support coordinator option is available.';
      case 'DRIVER_ARRIVED': return `Your driver has arrived at the pickup location. (${freshnessText})`;
      case 'DRIVER_NEAR_PICKUP': return `Your driver is approximately ${distanceMeters || 350}m away from your pickup point. (${freshnessText})`;
      case 'DRIVER_EN_ROUTE': return `Your driver is navigating to your pickup location. (${freshnessText})`;
      case 'TRIP_DELAY_RISK': return `We haven't received a recent location update. If you need assistance, tap Contact Support below.`;
      case 'DESTINATION_NEAR': return `You're approaching your dropoff destination. (${freshnessText})`;
      case 'TRIP_COMPLETED': return `Your trip has ended successfully. Thank you for riding with GET APNA DRIVER.`;
      default: return `Driver is assigned and getting ready. (${freshnessText})`;
    }
  }
}
