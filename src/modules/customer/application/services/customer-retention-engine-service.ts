import 'server-only';
import { prisma, type Db } from '@/shared/database/prisma';
import {
  CustomerLifecycleStatusDTO,
  RetentionActionTriggerDTO,
  CustomerLifecycleStage,
} from '../../domain/retention-engine-types';

/**
 * Phase 104 — Customer Retention Engine Service
 * Tracks customer lifecycle progression (NEW -> ADVOCATE), post-service follow-ups,
 * and automated Book Again reminders.
 */
export async function getCustomerLifecycleStatus(
  customerId: string,
  db: Db = prisma,
): Promise<CustomerLifecycleStatusDTO> {
  const [completedRidesCount, lastRide, favoriteDriver, repeatDiscountPromotion] =
    await Promise.all([
      db.booking.count({ where: { customerId, status: 'TRIP_COMPLETED' } }),
      db.booking.findFirst({
        where: { customerId, status: 'TRIP_COMPLETED' },
        orderBy: { createdAt: 'desc' },
      }),
      // Real saved favorite, not an invented name — a prior version always
      // claimed "Rajesh Kumar (Rating: 4.9)" regardless of whether the
      // customer has a favorite driver at all.
      db.customerFavoriteDriver.findFirst({
        where: { customerId },
        orderBy: { createdAt: 'desc' },
        include: { driverProfile: { include: { ratingSummary: true } } },
      }),
      // A real, currently-active, non-first-ride-only promotion to recommend
      // — a prior version always named 'REPEAT15', a code that doesn't exist
      // anywhere in the system, so rebooking with it would fail validation.
      db.promotion.findFirst({
        where: { status: 'ACTIVE', firstRideOnly: false },
        orderBy: { createdAt: 'desc' },
      }),
    ]);

  let stage: CustomerLifecycleStage = 'NEW';
  if (completedRidesCount >= 10) stage = 'ADVOCATE';
  else if (completedRidesCount >= 5) stage = 'LOYAL';
  else if (completedRidesCount >= 2) stage = 'REPEAT_BOOKING';
  else if (completedRidesCount === 1) stage = 'SATISFIED';

  const daysSinceLastRide = lastRide
    ? Math.floor((Date.now() - new Date(lastRide.createdAt).getTime()) / (1000 * 60 * 60 * 24))
    : 0;

  const activeReminders: RetentionActionTriggerDTO[] = [];

  if (completedRidesCount > 0 && daysSinceLastRide >= 7) {
    activeReminders.push({
      triggerId: 'trig-book-again-7d',
      triggerType: 'BOOK_AGAIN_REMINDER',
      title: 'Need a Driver this Weekend?',
      message: repeatDiscountPromotion
        ? `Rebook your favorite route from ${lastRide?.pickupAddress || 'Home'} and save with code ${repeatDiscountPromotion.code}!`
        : `Rebook your favorite route from ${lastRide?.pickupAddress || 'Home'}.`,
      actionUrl: '/bookings/new?rebook=true',
      discountOfferCode: repeatDiscountPromotion?.code ?? undefined,
      expiryHours: 48,
    });
  }

  const driverProfile = favoriteDriver?.driverProfile;
  const preferredDriverName = driverProfile
    ? [
        driverProfile.displayName ||
          [driverProfile.firstName, driverProfile.lastName].filter(Boolean).join(' ') ||
          'Driver',
        driverProfile.ratingSummary
          ? `(Rating: ${Number(driverProfile.ratingSummary.averageRating).toFixed(1)})`
          : undefined,
      ]
        .filter(Boolean)
        .join(' ')
    : undefined;

  return {
    customerId,
    stage,
    totalCompletedRides: completedRidesCount,
    daysSinceLastRide,
    // No NPS survey/response system exists anywhere in this platform — a
    // prior version claimed a fixed score of 9 for every customer.
    npsScore: undefined,
    preferredDriverName,
    activeReminders,
    suggestedNextBooking: lastRide
      ? {
          serviceType: lastRide.bookingType,
          pickupAddress: lastRide.pickupAddress,
          dropoffAddress: lastRide.dropoffAddress || 'Flexible Route',
          discountMessage: repeatDiscountPromotion
            ? `Save with code ${repeatDiscountPromotion.code} when rebooking your recent route today.`
            : 'Rebook your recent route today.',
        }
      : undefined,
  };
}
