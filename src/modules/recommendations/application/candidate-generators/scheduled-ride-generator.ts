import 'server-only';
import { type Db } from '@/shared/database/prisma';
import {
  type CandidateRecommendation,
  type RecommendationContextInput,
  RecommendationType,
  RecommendationPriority,
  RecommendationActionType,
} from '../../domain/recommendation-types';

export async function generateScheduledRideCandidates(
  context: RecommendationContextInput,
  db: Db,
): Promise<CandidateRecommendation[]> {
  const now = context.currentTimestamp || new Date();

  const activeScheduledRides = await db.scheduledRide.findMany({
    where: {
      customerId: context.customerId,
      status: 'ACTIVE',
    },
    orderBy: { nextOccurrenceAt: 'asc' },
    take: 3,
    select: {
      id: true,
      scheduleType: true,
      pickupAddress: true,
      dropoffAddress: true,
      nextOccurrenceAt: true,
      scheduledTime: true,
      vehicleCategory: true,
    },
  });

  if (activeScheduledRides.length === 0) {
    return [];
  }

  const candidates: CandidateRecommendation[] = [];

  for (const ride of activeScheduledRides) {
    const isSoon =
      ride.nextOccurrenceAt &&
      ride.nextOccurrenceAt.getTime() - now.getTime() < 48 * 3600 * 1000 &&
      ride.nextOccurrenceAt.getTime() > now.getTime();

    const priority = isSoon ? RecommendationPriority.P0 : RecommendationPriority.P1;
    const rawScore = isSoon ? 95 : 70;

    const dropoffTitle = ride.dropoffAddress || '';

    candidates.push({
      id: `scheduled_${ride.id}`,
      type: RecommendationType.UPCOMING_SCHEDULED_RIDE,
      priority,
      rawScore,
      titleKey: 'customer.recommendations.titles.upcomingScheduledRide',
      descriptionKey: dropoffTitle
        ? 'customer.recommendations.descriptions.scheduledRidePair'
        : 'customer.recommendations.descriptions.scheduledRidePickup',
      explanationKey: isSoon
        ? 'customer.recommendations.explanations.scheduledRideUpcomingSoon'
        : 'customer.recommendations.explanations.scheduledRideActive',
      explanationArgs: {
        time: ride.nextOccurrenceAt
          ? ride.nextOccurrenceAt.toLocaleString()
          : ride.scheduledTime,
      },
      action: {
        type: RecommendationActionType.VIEW_SCHEDULED_RIDE,
        href: `/customer/dashboard`,
        prefillParams: {
          scheduledRideId: ride.id,
        },
      },
      metadata: {
        scheduledRideId: ride.id,
        nextOccurrenceAt: ride.nextOccurrenceAt?.toISOString() || null,
        vehicleCategory: ride.vehicleCategory,
      },
    });
  }

  return candidates;
}
