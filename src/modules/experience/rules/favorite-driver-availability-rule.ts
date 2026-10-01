import type { CustomerExperienceContext } from '../domain/experience-context';
import type { ExperienceRecommendation } from '../domain/experience-types';

/**
 * Rule: Suggests hiring/booking customer's favorite driver with explicit explainability reason.
 */
export function evaluateFavoriteDriverAvailabilityRule(
  context: CustomerExperienceContext,
): ExperienceRecommendation | null {
  const { favoriteDrivers, customerPreference } = context;

  // Respect customer preference toggle
  if (
    customerPreference &&
    (customerPreference as Record<string, unknown>).favoriteDriverSuggestionsEnabled === false
  ) {
    return null;
  }

  if (!favoriteDrivers || favoriteDrivers.length === 0) {
    return null;
  }

  const fav = favoriteDrivers[0];
  const driverName = (fav as Record<string, any>).driverName || (fav as Record<string, any>).displayName || 'Favorite Chauffeur';
  const rawRating = fav.rating ?? (fav as Record<string, any>).ratingAverage;
  const rating = rawRating ? Number(rawRating).toFixed(1) : '5.0';

  return {
    id: `rec-fav-driver-${fav.driverProfileId}`,
    type: 'FAVORITE_DRIVER',
    category: 'CUSTOMER',
    title: `Hire Chauffeur ${driverName} (${rating}★)`,
    description: `Your top-rated favorite driver partner is available for instant booking.`,
    reason: `Why this suggestion? Suggested because you gave ${driverName} a 5-star rating and added them to your favorite drivers list.`,
    priority: 90,
    isDismissable: true,
    isMandatory: false,
    fingerprint: `fav_driver:${fav.driverProfileId}`,
    action: {
      type: 'OPEN_BOOKING_PREFILLED',
      targetUrl: `/bookings/new?preferredDriverId=${fav.driverProfileId}`,
      payload: {
        driverProfileId: fav.driverProfileId,
      },
    },
    createdAt: new Date().toISOString(),
  };
}
