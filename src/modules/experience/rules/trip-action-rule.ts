import type { ExperienceContext } from '../domain/experience-context';
import type { ExperienceRecommendation } from '../domain/experience-types';
import {
  buildRecommendation,
  createExperienceFingerprint,
} from '../domain/experience-recommendation';
import { EXPERIENCE_PRIORITY_WEIGHTS } from '../domain/experience-policy';

export function evaluateTripActionRule(context: ExperienceContext): ExperienceRecommendation[] {
  const recommendations: ExperienceRecommendation[] = [];

  if (context.category === 'CUSTOMER') {
    // 1. Safety Alerts (Highest Priority, Non-Dismissable)
    if (context.safetyAlerts && context.safetyAlerts.length > 0) {
      const alert = context.safetyAlerts[0];
      const fingerprint = createExperienceFingerprint(context.userId, 'SAFETY', alert.id);

      recommendations.push(
        buildRecommendation({
          type: 'SAFETY',
          category: 'CUSTOMER',
          title: `Safety Hub: ${alert.title}`,
          description: `Active safety monitor: ${alert.severity} status. Tap to open SOS Emergency Hub.`,
          reason: 'Active safety monitor event detected',
          priority: EXPERIENCE_PRIORITY_WEIGHTS.SAFETY,
          isDismissable: false,
          isMandatory: true,
          fingerprint,
          action: {
            type: 'NAVIGATE_PAGE',
            targetUrl: '/customer/safety-sos',
            payload: { alertId: alert.id },
          },
          metadata: { alertId: alert.id },
        }),
      );
    }

    // 2. Active Trip Action
    if (context.activeBooking) {
      const booking = context.activeBooking;
      const fingerprint = createExperienceFingerprint(context.userId, 'ACTIVE_TRIP', booking.id);

      recommendations.push(
        buildRecommendation({
          type: 'ACTIVE_TRIP',
          category: 'CUSTOMER',
          title: `Ride In Progress`,
          description: booking.driverName
            ? `Chauffeur ${booking.driverName} is assigned (${booking.status}). Track live location.`
            : `Booking ${booking.status}. Tap to open live tracking.`,
          reason: 'Customer active ride in progress',
          priority: EXPERIENCE_PRIORITY_WEIGHTS.ACTIVE_TRIP,
          isDismissable: false,
          isMandatory: true,
          fingerprint,
          action: {
            type: 'NAVIGATE_PAGE',
            targetUrl: `/bookings/${booking.id}`,
            payload: { bookingId: booking.id },
          },
          metadata: { bookingId: booking.id, status: booking.status },
        }),
      );
    }
  } else {
    // Driver Category
    // 1. Reliability Incidents (Non-Dismissable)
    if (context.reliabilityIncidents && context.reliabilityIncidents.length > 0) {
      const incident = context.reliabilityIncidents[0];
      const fingerprint = createExperienceFingerprint(context.userId, 'RELIABILITY', incident.id);

      recommendations.push(
        buildRecommendation({
          type: 'RELIABILITY',
          category: 'DRIVER',
          title: `Trip Reliability Update`,
          description: `${incident.message}`,
          reason: 'Active reliability monitor event',
          priority: EXPERIENCE_PRIORITY_WEIGHTS.RELIABILITY,
          isDismissable: false,
          isMandatory: true,
          fingerprint,
          action: {
            type: 'TRIGGER_SUPPORT',
            targetUrl: '/driver/sos-support',
            payload: { incidentId: incident.id },
          },
          metadata: { incidentId: incident.id },
        }),
      );
    }

    // 2. Driver Active Trip
    if (context.activeBooking) {
      const booking = context.activeBooking;
      const fingerprint = createExperienceFingerprint(context.userId, 'TRIP_ACTION', booking.id);

      recommendations.push(
        buildRecommendation({
          type: 'TRIP_ACTION',
          category: 'DRIVER',
          title: `Active Mission Navigation`,
          description: `Current trip (${booking.status}) to ${booking.dropoffAddress.split(',')[0]}.`,
          reason: 'Active driver mission in progress',
          priority: EXPERIENCE_PRIORITY_WEIGHTS.TRIP_ACTION,
          isDismissable: false,
          isMandatory: true,
          fingerprint,
          action: {
            type: 'NAVIGATE_PAGE',
            targetUrl: `/driver/bookings/${booking.id}`,
            payload: { bookingId: booking.id },
          },
          metadata: { bookingId: booking.id },
        }),
      );
    }

    // 3. Off-duty reminder if no active trip and driver is off duty
    if (!context.activeBooking && !context.isOnDuty) {
      const fingerprint = createExperienceFingerprint(
        context.userId,
        'TRIP_ACTION',
        'off_duty_prompt',
      );

      recommendations.push(
        buildRecommendation({
          type: 'TRIP_ACTION',
          category: 'DRIVER',
          title: `You are Off Duty`,
          description: `Go online to receive nearby hourly and outstation trip assignments.`,
          reason: 'Driver offline status notification',
          priority: 55,
          isDismissable: true,
          isMandatory: false,
          fingerprint,
          action: {
            type: 'GO_ONLINE',
            targetUrl: '/driver',
            payload: {},
          },
        }),
      );
    }
  }

  return recommendations;
}
