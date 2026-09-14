import 'server-only';
import { type Db } from '@/shared/database/prisma';
import { getInteger } from '@/shared/config/configuration-service';
import { buildRouteKey } from '../../utils/route-normalization';
import {
  type CandidateRecommendation,
  type RecommendationContextInput,
  RecommendationType,
  RecommendationPriority,
  RecommendationActionType,
} from '../../domain/recommendation-types';

export async function generateUsualRouteCandidates(
  context: RecommendationContextInput,
  db: Db,
): Promise<CandidateRecommendation[]> {
  const minOccurrences = await getInteger('recommendation.min_route_occurrences', 2, db);

  const completedBookings = await db.booking.findMany({
    where: {
      customerId: context.customerId,
      status: 'TRIP_COMPLETED',
    },
    orderBy: { createdAt: 'desc' },
    take: 50,
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

  if (completedBookings.length < minOccurrences) {
    return [];
  }

  // Cluster by route key
  const routeGroups = new Map<
    string,
    {
      count: number;
      sample: (typeof completedBookings)[0];
      recentDate: Date;
    }
  >();

  for (const booking of completedBookings) {
    const key = buildRouteKey(
      booking.pickupLatitude,
      booking.pickupLongitude,
      booking.dropoffLatitude,
      booking.dropoffLongitude,
      booking.savedLocationId,
    );

    const existing = routeGroups.get(key);
    if (existing) {
      existing.count += 1;
    } else {
      routeGroups.set(key, {
        count: 1,
        sample: booking,
        recentDate: new Date(booking.createdAt),
      });
    }
  }

  const candidates: CandidateRecommendation[] = [];

  for (const [routeKey, group] of routeGroups.entries()) {
    if (group.count >= minOccurrences) {
      const sample = group.sample;
      const dropoffTitle = sample.dropoffLabel || sample.dropoffAddress || '';

      const rawScore = 50 + Math.min(group.count * 10, 40); // Base 50 + frequency boost

      candidates.push({
        id: `usual_${sample.id}`,
        type: RecommendationType.USUAL_ROUTE,
        priority: RecommendationPriority.P1,
        rawScore,
        titleKey: 'customer.recommendations.titles.usualRoute',
        descriptionKey: dropoffTitle
          ? 'customer.recommendations.descriptions.usualRoutePair'
          : 'customer.recommendations.descriptions.usualRoutePickup',
        explanationKey: 'customer.recommendations.explanations.usualRouteCount',
        explanationArgs: { count: group.count },
        action: {
          type: RecommendationActionType.BOOK_NOW,
          href: `/bookings/new?prefillPickup=${encodeURIComponent(sample.pickupAddress)}&prefillDropoff=${encodeURIComponent(dropoffTitle)}`,
          prefillParams: {
            pickupAddress: sample.pickupAddress,
            pickupLatitude: sample.pickupLatitude,
            pickupLongitude: sample.pickupLongitude,
            dropoffAddress: sample.dropoffAddress || '',
            dropoffLatitude: sample.dropoffLatitude || 0,
            dropoffLongitude: sample.dropoffLongitude || 0,
            bookingType: sample.bookingType,
          },
        },
        metadata: {
          occurrenceCount: group.count,
          pickupAddress: sample.pickupAddress,
          dropoffAddress: sample.dropoffAddress,
        },
        routeKey,
      });
    }
  }

  return candidates;
}
