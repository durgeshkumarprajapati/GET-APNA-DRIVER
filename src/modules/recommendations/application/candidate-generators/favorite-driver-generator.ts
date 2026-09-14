import 'server-only';
import { type Db } from '@/shared/database/prisma';
import { isDriverDispatchEligible } from '@/modules/driver/application/services/driver-eligibility-service';
import {
  type CandidateRecommendation,
  type RecommendationContextInput,
  RecommendationType,
  RecommendationPriority,
  RecommendationActionType,
} from '../../domain/recommendation-types';

export async function generateFavoriteDriverCandidates(
  context: RecommendationContextInput,
  db: Db,
): Promise<CandidateRecommendation[]> {
  const favorites = await db.customerFavoriteDriver.findMany({
    where: { customerId: context.customerId },
    take: 5,
    include: {
      driverProfile: {
        select: {
          id: true,
          displayName: true,
          firstName: true,
          lastName: true,
          user: {
            select: {
              accountStatus: true,
            },
          },
        },
      },
    },
  });

  if (favorites.length === 0) {
    return [];
  }

  const candidates: CandidateRecommendation[] = [];

  for (const fav of favorites) {
    const driver = fav.driverProfile;
    if (!driver || driver.user.accountStatus !== 'ACTIVE') {
      continue;
    }

    // Evaluate live compliance & schedule dispatch eligibility
    const eligibility = await isDriverDispatchEligible(driver.id, context.currentTimestamp || new Date(), db);
    if (!eligibility.isEligible) {
      continue;
    }

    const driverName = driver.displayName || [driver.firstName, driver.lastName].filter(Boolean).join(' ') || 'Chauffeur';

    candidates.push({
      id: `fav_driver_${driver.id}`,
      type: RecommendationType.FAVORITE_DRIVER,
      priority: RecommendationPriority.P0, // High priority when favorite is available
      rawScore: 85,
      titleKey: 'customer.recommendations.titles.favoriteDriver',
      descriptionKey: 'customer.recommendations.descriptions.favoriteDriverAvailable',
      explanationKey: 'customer.recommendations.explanations.favoriteDriverAvailable',
      explanationArgs: { driverName },
      action: {
        type: RecommendationActionType.BOOK_NOW,
        href: `/bookings/new?preferredDriverProfileId=${driver.id}`,
        prefillParams: {
          preferredDriverProfileId: driver.id,
          driverName,
        },
      },
      metadata: {
        driverProfileId: driver.id,
        driverName,
      },
    });
  }

  return candidates;
}
