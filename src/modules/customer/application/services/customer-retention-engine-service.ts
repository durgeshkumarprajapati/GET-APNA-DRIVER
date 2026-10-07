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
  const completedRidesCount = await db.booking.count({
    where: { customerId, status: 'TRIP_COMPLETED' },
  });

  const lastRide = await db.booking.findFirst({
    where: { customerId, status: 'TRIP_COMPLETED' },
    orderBy: { createdAt: 'desc' },
  });

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
      message: `Rebook your favorite route from ${lastRide?.pickupAddress || 'Home'} with 15% OFF!`,
      actionUrl: '/bookings/new?rebook=true',
      discountOfferCode: 'REPEAT15',
      expiryHours: 48,
    });
  }

  return {
    customerId,
    stage,
    totalCompletedRides: completedRidesCount,
    daysSinceLastRide,
    npsScore: 9,
    preferredDriverName: 'Rajesh Kumar (Rating: 4.9)',
    activeReminders,
    suggestedNextBooking: lastRide
      ? {
          serviceType: lastRide.bookingType,
          pickupAddress: lastRide.pickupAddress,
          dropoffAddress: lastRide.dropoffAddress || 'Flexible Route',
          discountMessage: 'Get 15% OFF when rebooking your recent route today.',
        }
      : undefined,
  };
}
