import type { CustomerExperienceContext } from '../domain/experience-context';
import type { ExperienceRecommendation } from '../domain/experience-types';
import {
  buildRecommendation,
  createExperienceFingerprint,
} from '../domain/experience-recommendation';
import { EXPERIENCE_PRIORITY_WEIGHTS } from '../domain/experience-policy';

export function evaluateBookAgainRule(
  context: CustomerExperienceContext,
): ExperienceRecommendation | null {
  if (!context.completedBookings || context.completedBookings.length === 0) {
    return null;
  }

  // Pick the most recent completed booking
  const recentBooking = context.completedBookings[0];
  if (!recentBooking.pickupAddress || !recentBooking.dropoffAddress) {
    return null;
  }

  const fingerprint = createExperienceFingerprint(context.userId, 'BOOK_AGAIN', recentBooking.id);

  return buildRecommendation({
    type: 'BOOK_AGAIN',
    category: 'CUSTOMER',
    title: `Book Again to ${recentBooking.dropoffAddress.split(',')[0]}`,
    description: `Re-book your recent route from ${recentBooking.pickupAddress.split(',')[0]} to ${recentBooking.dropoffAddress.split(',')[0]}.`,
    reason: 'Frequently booked route based on completed trips',
    priority: EXPERIENCE_PRIORITY_WEIGHTS.BOOK_AGAIN,
    isDismissable: true,
    isMandatory: false,
    fingerprint,
    action: {
      type: 'OPEN_BOOKING_PREFILLED',
      targetUrl: '/bookings/new',
      payload: {
        pickupAddress: recentBooking.pickupAddress,
        pickupLat: recentBooking.pickupLat,
        pickupLng: recentBooking.pickupLng,
        dropoffAddress: recentBooking.dropoffAddress,
        dropoffLat: recentBooking.dropoffLat,
        dropoffLng: recentBooking.dropoffLng,
        vehicleCategory: recentBooking.vehicleCategory,
        preferredDriverId: recentBooking.driverProfileId,
      },
    },
    metadata: {
      bookingId: recentBooking.id,
      completedAt: recentBooking.completedAt,
    },
  });
}
