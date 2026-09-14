import 'server-only';
import { type Db } from '@/shared/database/prisma';
import {
  type CandidateRecommendation,
  type RecommendationContextInput,
  RecommendationType,
  RecommendationPriority,
  RecommendationActionType,
} from '../../domain/recommendation-types';

export async function generatePromotionCandidates(
  context: RecommendationContextInput,
  db: Db,
): Promise<CandidateRecommendation[]> {
  const now = context.currentTimestamp || new Date();

  const activePromotions = await db.promotion.findMany({
    where: {
      status: 'ACTIVE',
      startsAt: { lte: now },
      OR: [{ endsAt: null }, { endsAt: { gte: now } }],
    },
    orderBy: { createdAt: 'desc' },
    take: 3,
  });

  if (activePromotions.length === 0) {
    return [];
  }

  // Check customer completed trip count for first-ride promotions
  const completedTripsCount = await db.booking.count({
    where: {
      customerId: context.customerId,
      status: 'TRIP_COMPLETED',
    },
  });

  const candidates: CandidateRecommendation[] = [];

  for (const promo of activePromotions) {
    if (promo.firstRideOnly && completedTripsCount > 0) {
      continue;
    }

    if (promo.totalUsageLimit !== null && promo.totalUsageCount >= promo.totalUsageLimit) {
      continue;
    }

    const priority = promo.firstRideOnly ? RecommendationPriority.P1 : RecommendationPriority.P3;
    const rawScore = promo.firstRideOnly ? 75 : 50;

    candidates.push({
      id: `promo_${promo.id}`,
      type: RecommendationType.PROMOTION,
      priority,
      rawScore,
      titleKey: 'customer.recommendations.titles.promotionAvailable',
      descriptionKey: 'customer.recommendations.descriptions.promotionDetails',
      explanationKey: promo.firstRideOnly
        ? 'customer.recommendations.explanations.firstRidePromo'
        : 'customer.recommendations.explanations.activePromoCode',
      explanationArgs: {
        promoName: promo.name,
        code: promo.code || '',
      },
      action: {
        type: RecommendationActionType.VIEW_PROMOTION,
        href: `/bookings/new?promoCode=${encodeURIComponent(promo.code || '')}`,
        prefillParams: {
          promoCode: promo.code || '',
        },
      },
      metadata: {
        promotionId: promo.id,
        code: promo.code,
        discountType: promo.discountType,
        discountValue: Number(promo.discountValue),
      },
    });
  }

  return candidates;
}
