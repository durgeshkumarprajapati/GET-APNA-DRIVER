import 'server-only';
import { type Db } from '@/shared/database/prisma';
import {
  type CandidateRecommendation,
  type RecommendationContextInput,
  RecommendationType,
  RecommendationPriority,
  RecommendationActionType,
} from '../../domain/recommendation-types';

function savedLocationFullAddress(loc: { addressLine1: string; addressLine2?: string | null; city: string }): string {
  return [loc.addressLine1, loc.addressLine2, loc.city].filter(Boolean).join(', ');
}

export async function generateSavedLocationCandidates(
  context: RecommendationContextInput,
  db: Db,
): Promise<CandidateRecommendation[]> {
  const locations = await db.savedLocation.findMany({
    where: { userId: context.customerId },
    orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }],
    take: 4,
    select: {
      id: true,
      label: true,
      addressLine1: true,
      addressLine2: true,
      city: true,
      latitude: true,
      longitude: true,
      isDefault: true,
    },
  });

  if (locations.length === 0) {
    return [];
  }

  const candidates: CandidateRecommendation[] = [];

  for (const loc of locations) {
    const fullAddress = savedLocationFullAddress(loc);
    const routeKey = `saved:${loc.id}`;

    candidates.push({
      id: `saved_loc_${loc.id}`,
      type: RecommendationType.SAVED_PLACE,
      priority: RecommendationPriority.P2,
      rawScore: loc.isDefault ? 55 : 45,
      titleKey: 'customer.recommendations.titles.savedPlace',
      descriptionKey: 'customer.recommendations.descriptions.savedPlaceTrip',
      explanationKey: 'customer.recommendations.explanations.savedPlacePattern',
      explanationArgs: { placeLabel: loc.label },
      action: {
        type: RecommendationActionType.OPEN_SAVED_LOCATION,
        href: `/bookings/new?savedLocationId=${loc.id}`,
        prefillParams: {
          savedLocationId: loc.id,
          label: loc.label,
          dropoffAddress: fullAddress,
          dropoffLatitude: Number(loc.latitude),
          dropoffLongitude: Number(loc.longitude),
        },
      },
      metadata: {
        savedLocationId: loc.id,
        label: loc.label,
        address: fullAddress,
      },
      routeKey,
    });
  }

  return candidates;
}
