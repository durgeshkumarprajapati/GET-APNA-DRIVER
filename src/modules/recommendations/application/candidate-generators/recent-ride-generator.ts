import 'server-only';
import { type Db } from '@/shared/database/prisma';
import { buildRouteKey } from '../../utils/route-normalization';
import {
  type CandidateRecommendation,
  type RecommendationContextInput,
  RecommendationType,
  RecommendationPriority,
  RecommendationActionType,
} from '../../domain/recommendation-types';

export async function generateRecentRideCandidates(
  context: RecommendationContextInput,
  db: Db,
): Promise<CandidateRecommendation[]> {
  const recentBookings = await db.booking.findMany({
    where: {
      customerId: context.customerId,
      status: 'TRIP_COMPLETED',
    },
    orderBy: { createdAt: 'desc' },
    take: 2,
    select: {
      id: true,
      pickupLatitude: true,
      pickupLongitude: true,
      pickupAddress: true,
      pickupLabel: true,
      dropoffLatitude: true,
      dropoffLongitude: true,
      dropoffAddress: true,
      dropoffLabel: true,
      savedLocationId: true,
      bookingType: true,
      createdAt: true,
    },
  });

  if (recentBookings.length === 0) {
    return [];
  }

  const mostRecent = recentBookings[0];
  const routeKey = buildRouteKey(
    mostRecent.pickupLatitude,
    mostRecent.pickupLongitude,
    mostRecent.dropoffLatitude,
    mostRecent.dropoffLongitude,
    mostRecent.savedLocationId,
  );

  const dropoffTitle = mostRecent.dropoffLabel || mostRecent.dropoffAddress || '';

  return [
    {
      id: `recent_${mostRecent.id}`,
      type: RecommendationType.BOOK_AGAIN,
      priority: RecommendationPriority.P1,
      rawScore: 65, // Strong recency score
      titleKey: 'customer.recommendations.titles.bookAgain',
      descriptionKey: dropoffTitle
        ? 'customer.recommendations.descriptions.recentTripPair'
        : 'customer.recommendations.descriptions.recentTripPickup',
      explanationKey: 'customer.recommendations.explanations.recentRideCompleted',
      explanationArgs: {
        date: new Date(mostRecent.createdAt).toLocaleDateString(),
      },
      action: {
        type: RecommendationActionType.BOOK_AGAIN,
        href: `/bookings/new?bookAgain=${mostRecent.id}`,
        prefillParams: {
          bookAgainId: mostRecent.id,
          pickupAddress: mostRecent.pickupAddress,
          dropoffAddress: mostRecent.dropoffAddress || '',
          bookingType: mostRecent.bookingType,
        },
      },
      metadata: {
        bookingId: mostRecent.id,
        completedAt: mostRecent.createdAt.toISOString(),
      },
      routeKey,
    },
  ];
}
