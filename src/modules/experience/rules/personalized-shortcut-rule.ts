import type { CustomerExperienceContext } from '../domain/experience-context';
import type { ExperienceRecommendation } from '../domain/experience-types';
import {
  buildRecommendation,
  createExperienceFingerprint,
} from '../domain/experience-recommendation';
import { EXPERIENCE_PRIORITY_WEIGHTS } from '../domain/experience-policy';

const OUTSTATION_BOOKING_TYPES = new Set(['DAILY', 'WEEKLY', 'FULL_DAY', 'MULTI_DAY', 'MONTHLY']);

/**
 * Suggests a one-tap rebook shortcut for a customer's recurring outstation/
 * multi-day hires — genuinely distinct from evaluateBookAgainRule (which
 * only ever looks at the single most recent completed trip, any type).
 * A previous version of this rule also emitted a second "frequent commute"
 * shortcut built from the same completedBookings[0] book-again-rule
 * already uses — removed as a pure duplicate rather than deduplicated,
 * since nothing here needs that case beyond what book-again already does.
 */
export function evaluatePersonalizedShortcutRule(
  context: CustomerExperienceContext,
): ExperienceRecommendation[] {
  if (context.customerPreference?.personalizedShortcutsEnabled === false) {
    return [];
  }

  const recentBookings = context.completedBookings;
  if (!recentBookings || recentBookings.length === 0) {
    return [];
  }

  const outstationTrips = recentBookings.filter(
    (b) => b.bookingType && OUTSTATION_BOOKING_TYPES.has(b.bookingType),
  );

  if (outstationTrips.length < 2) {
    return [];
  }

  const lastTrip = outstationTrips[0];
  const pickupAddr = lastTrip.pickupAddress.split(',')[0] || 'your location';
  const dropoffAddr = lastTrip.dropoffAddress?.split(',')[0] || 'your outstation destination';
  const bookingTypeLabel = (lastTrip.bookingType ?? 'DAILY').toLowerCase();

  const fingerprint = createExperienceFingerprint(
    context.userId,
    'BOOK_AGAIN',
    `outstation:${lastTrip.id}`,
  );

  return [
    buildRecommendation({
      type: 'BOOK_AGAIN',
      category: 'CUSTOMER',
      title: `Outstation Driver: ${pickupAddr} → ${dropoffAddr}`,
      description: `Quickly book your recurring ${bookingTypeLabel} chauffeur service.`,
      reason: `Shown because you've booked ${outstationTrips.length} outstation/multi-day trips recently, including this route.`,
      priority: EXPERIENCE_PRIORITY_WEIGHTS.BOOK_AGAIN,
      isDismissable: true,
      isMandatory: false,
      fingerprint,
      action: {
        type: 'OPEN_BOOKING_PREFILLED',
        targetUrl: `/bookings/new?bookAgain=${lastTrip.id}&type=${lastTrip.bookingType ?? 'DAILY'}`,
        payload: {
          bookingId: lastTrip.id,
          bookingType: lastTrip.bookingType,
        },
      },
      metadata: {
        bookingId: lastTrip.id,
        outstationTripCount: outstationTrips.length,
      },
    }),
  ];
}
