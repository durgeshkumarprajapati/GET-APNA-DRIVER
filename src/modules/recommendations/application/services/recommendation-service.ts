import 'server-only';
import { type Db } from '@/shared/database/prisma';
import {
  type CandidateRecommendation,
  type RecommendationDTO,
  type RecommendationContextInput,
} from '../../domain/recommendation-types';
import { generateUsualRouteCandidates } from '../candidate-generators/usual-route-generator';
import { generateRecentRideCandidates } from '../candidate-generators/recent-ride-generator';
import { generateFavoriteDriverCandidates } from '../candidate-generators/favorite-driver-generator';
import { generateSavedLocationCandidates } from '../candidate-generators/saved-location-generator';
import { generateScheduledRideCandidates } from '../candidate-generators/scheduled-ride-generator';
import { generateVehiclePreferenceCandidates } from '../candidate-generators/vehicle-preference-generator';
import { generateLoyaltyCandidates } from '../candidate-generators/loyalty-generator';
import { generatePromotionCandidates } from '../candidate-generators/promotion-generator';
import { deduplicateCandidates } from './recommendation-deduplication-service';
import { defaultScorer } from './recommendation-scoring-service';
import {
  getCachedRecommendations,
  setCachedRecommendations,
} from '../../infrastructure/recommendation-cache';

export async function getRecommendationsForCustomer(
  context: RecommendationContextInput,
  db: Db,
  options?: { limit?: number; bypassCache?: boolean },
): Promise<RecommendationDTO[]> {
  const limit = options?.limit ?? 5;

  if (!options?.bypassCache) {
    const cached = await getCachedRecommendations(context.customerId);
    if (cached) {
      return cached.slice(0, limit);
    }
  }

  const [
    usualRoutes,
    recentRides,
    favoriteDrivers,
    savedLocations,
    scheduledRides,
    vehiclePrefs,
    loyaltyItems,
    promotions,
  ] = await Promise.all([
    generateUsualRouteCandidates(context, db),
    generateRecentRideCandidates(context, db),
    generateFavoriteDriverCandidates(context, db),
    generateSavedLocationCandidates(context, db),
    generateScheduledRideCandidates(context, db),
    generateVehiclePreferenceCandidates(context, db),
    generateLoyaltyCandidates(context, db),
    generatePromotionCandidates(context, db),
  ]);

  const rawCandidates: CandidateRecommendation[] = [
    ...scheduledRides,
    ...favoriteDrivers,
    ...recentRides,
    ...usualRoutes,
    ...savedLocations,
    ...vehiclePrefs,
    ...loyaltyItems,
    ...promotions,
  ];

  const dedupedCandidates = deduplicateCandidates(rawCandidates);
  const scored = defaultScorer.scoreCandidates(dedupedCandidates, context);
  const finalRecommendations = scored.slice(0, limit);

  await setCachedRecommendations(context.customerId, finalRecommendations, 60);

  return finalRecommendations;
}
