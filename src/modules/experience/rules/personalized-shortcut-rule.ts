import type { CustomerExperienceContext } from '../domain/experience-context';
import type { ExperienceRecommendation } from '../domain/experience-types';

/**
 * Rule: Evaluates customer's travel patterns to generate personalized shortcuts
 * with explicit explainability reasons.
 */
export function evaluatePersonalizedShortcutRule(
  context: CustomerExperienceContext,
): ExperienceRecommendation[] {
  const recommendations: ExperienceRecommendation[] = [];

  const { customerPreference } = context;
  const recentBookings = context.completedBookings || (context as Record<string, any>).recentBookings || [];

  // Respect customer personalization controls
  if (customerPreference && (customerPreference as Record<string, unknown>).personalizedShortcutsEnabled === false) {
    return [];
  }

  if (!recentBookings || recentBookings.length === 0) {
    return [];
  }

  // 1. Check for Outstation / Long Duration trips
  const outstationTrips = recentBookings.filter(
    (b: Record<string, any>) => b.bookingType === 'OUTSTATION' || b.bookingType === 'DAILY' || b.bookingType === 'WEEKLY',
  );

  if (outstationTrips.length >= 2) {
    const lastTrip: any = outstationTrips[0];
    const pickupAddr = lastTrip.pickupAddress?.split(',')[0] || lastTrip.pickupLocation?.address?.split(',')[0] || 'your location';
    const dropoffAddr = lastTrip.dropoffAddress?.split(',')[0] || lastTrip.dropoffLocation?.address?.split(',')[0] || 'outstation destination';
    const bookingTypeStr = String(lastTrip.bookingType || 'OUTSTATION');

    recommendations.push({
      id: `shortcut-outstation-${lastTrip.id}`,
      type: 'BOOK_AGAIN',
      category: 'CUSTOMER',
      title: `Weekend Outstation Driver: ${pickupAddr} → ${dropoffAddr}`,
      description: `Quickly book your preferred ${bookingTypeStr.toLowerCase()} driver service.`,
      reason: `Why this suggestion? Recommended because you frequently book outstation chauffeur services on weekends.`,
      priority: 85,
      isDismissable: true,
      isMandatory: false,
      fingerprint: `shortcut:outstation:${bookingTypeStr}:${pickupAddr}`,
      action: {
        type: 'OPEN_BOOKING_PREFILLED',
        targetUrl: `/bookings/new?bookAgain=${lastTrip.id}&type=${bookingTypeStr}`,
        payload: {
          bookingId: lastTrip.id,
          bookingType: bookingTypeStr,
        },
      },
      createdAt: new Date().toISOString(),
    });
  }

  // 2. Check for Frequent Commute / Regular Ride
  const cityTrips = recentBookings.filter(
    (b: Record<string, any>) => b.bookingType === 'ONE_WAY' || b.bookingType === 'HOURLY',
  );

  if (cityTrips.length >= 1) {
    const frequentTrip: any = cityTrips[0];
    const pickupLabel = frequentTrip.pickupAddress?.split(',')[0] || frequentTrip.pickupLocation?.label || frequentTrip.pickupLocation?.address?.split(',')[0] || 'Home';
    const dropoffLabel = frequentTrip.dropoffAddress?.split(',')[0] || frequentTrip.dropoffLocation?.label || frequentTrip.dropoffLocation?.address?.split(',')[0] || 'Destination';

    recommendations.push({
      id: `shortcut-commute-${frequentTrip.id}`,
      type: 'SAVED_PLACE',
      category: 'CUSTOMER',
      title: `Quick Commute: ${pickupLabel} → ${dropoffLabel}`,
      description: `One-tap booking shortcut for your frequent city commute.`,
      reason: `Why this suggestion? Based on your recent travel history to ${dropoffLabel}.`,
      priority: 80,
      isDismissable: true,
      isMandatory: false,
      fingerprint: `shortcut:commute:${pickupLabel}:${dropoffLabel}`,
      action: {
        type: 'OPEN_BOOKING_PREFILLED',
        targetUrl: `/bookings/new?bookAgain=${frequentTrip.id}`,
        payload: {
          bookingId: frequentTrip.id,
        },
      },
      createdAt: new Date().toISOString(),
    });
  }

  return recommendations;
}
