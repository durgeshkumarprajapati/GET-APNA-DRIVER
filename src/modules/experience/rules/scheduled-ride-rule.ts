import type { CustomerExperienceContext } from '../domain/experience-context';
import type { ExperienceRecommendation } from '../domain/experience-types';
import {
  buildRecommendation,
  createExperienceFingerprint,
} from '../domain/experience-recommendation';
import { EXPERIENCE_PRIORITY_WEIGHTS } from '../domain/experience-policy';

export function evaluateScheduledRideRule(
  context: CustomerExperienceContext,
): ExperienceRecommendation | null {
  if (!context.scheduledRides || context.scheduledRides.length === 0) {
    return null;
  }

  const upcomingRide = context.scheduledRides.find(
    (r) => r.status === 'ACTIVE' || r.status === 'PENDING',
  );
  if (!upcomingRide) {
    return null;
  }

  const fingerprint = createExperienceFingerprint(
    context.userId,
    'SCHEDULED_RIDE',
    upcomingRide.id,
  );

  const formattedTime = new Date(upcomingRide.scheduledTime).toLocaleString('en-IN', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });

  return buildRecommendation({
    type: 'SCHEDULED_RIDE',
    category: 'CUSTOMER',
    title: `Upcoming Scheduled Chauffeur Ride`,
    description: `Your ride to ${upcomingRide.dropoffAddress.split(',')[0]} is scheduled for ${formattedTime}.`,
    reason: 'Scheduled chauffeur booking active',
    priority: EXPERIENCE_PRIORITY_WEIGHTS.SCHEDULED_RIDE,
    isDismissable: true,
    isMandatory: false,
    fingerprint,
    action: {
      type: 'VIEW_SCHEDULED_RIDE',
      targetUrl: `/customer/scheduled-rides/${upcomingRide.id}`,
      payload: {
        scheduledRideId: upcomingRide.id,
      },
    },
    metadata: {
      scheduledRideId: upcomingRide.id,
      scheduledTime: upcomingRide.scheduledTime,
    },
  });
}
