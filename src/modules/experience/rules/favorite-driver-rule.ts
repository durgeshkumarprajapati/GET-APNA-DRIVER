import type { CustomerExperienceContext } from '../domain/experience-context';
import type { ExperienceRecommendation } from '../domain/experience-types';
import {
  buildRecommendation,
  createExperienceFingerprint,
} from '../domain/experience-recommendation';
import { EXPERIENCE_PRIORITY_WEIGHTS } from '../domain/experience-policy';

export function evaluateFavoriteDriverRule(
  context: CustomerExperienceContext,
): ExperienceRecommendation | null {
  if (!context.favoriteDrivers || context.favoriteDrivers.length === 0) {
    return null;
  }

  // Find an available favorite driver
  const availableDriver =
    context.favoriteDrivers.find((d) => d.isAvailable) || context.favoriteDrivers[0];
  if (!availableDriver) {
    return null;
  }

  const fingerprint = createExperienceFingerprint(
    context.userId,
    'FAVORITE_DRIVER',
    availableDriver.driverProfileId,
  );

  return buildRecommendation({
    type: 'FAVORITE_DRIVER',
    category: 'CUSTOMER',
    title: `Book with ${availableDriver.driverName}`,
    description: availableDriver.isAvailable
      ? `${availableDriver.driverName} is online and available for direct assignment.`
      : `Your saved favorite driver (${availableDriver.rating}★ rating).`,
    reason: availableDriver.isAvailable
      ? 'Favorite driver is currently online'
      : 'Saved favorite driver in your profile',
    priority: EXPERIENCE_PRIORITY_WEIGHTS.FAVORITE_DRIVER + (availableDriver.isAvailable ? 10 : 0),
    isDismissable: true,
    isMandatory: false,
    fingerprint,
    action: {
      type: 'OPEN_BOOKING_PREFILLED',
      targetUrl: '/bookings/new',
      payload: {
        preferredDriverId: availableDriver.driverProfileId,
        driverName: availableDriver.driverName,
      },
    },
    metadata: {
      driverProfileId: availableDriver.driverProfileId,
      rating: availableDriver.rating,
      isAvailable: availableDriver.isAvailable,
    },
  });
}
