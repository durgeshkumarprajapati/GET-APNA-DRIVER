import 'server-only';
import { type Db } from '@/shared/database/prisma';
import {
  type CandidateRecommendation,
  type RecommendationContextInput,
  RecommendationType,
  RecommendationPriority,
  RecommendationActionType,
} from '../../domain/recommendation-types';

export async function generateVehiclePreferenceCandidates(
  context: RecommendationContextInput,
  db: Db,
): Promise<CandidateRecommendation[]> {
  const completedBookings = await db.booking.findMany({
    where: {
      customerId: context.customerId,
      status: 'TRIP_COMPLETED',
    },
    take: 30,
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      vehicleClass: true,
    },
  });

  if (completedBookings.length < 3) {
    return [];
  }

  const categoryCounts = new Map<string, number>();
  for (const b of completedBookings) {
    const vClass = b.vehicleClass || 'SEDAN';
    categoryCounts.set(vClass, (categoryCounts.get(vClass) || 0) + 1);
  }

  let topCategory = 'SEDAN';
  let maxCount = 0;
  for (const [cat, count] of categoryCounts.entries()) {
    if (count > maxCount) {
      maxCount = count;
      topCategory = cat;
    }
  }

  const ratio = maxCount / completedBookings.length;
  if (ratio < 0.5) {
    return [];
  }

  const rawScore = 45 + Math.min(Math.round(ratio * 30), 30);

  return [
    {
      id: `vehicle_pref_${topCategory}`,
      type: RecommendationType.VEHICLE_PREFERENCE,
      priority: RecommendationPriority.P2,
      rawScore,
      titleKey: 'customer.recommendations.titles.vehiclePreference',
      descriptionKey: 'customer.recommendations.descriptions.preferredVehicleCategory',
      explanationKey: 'customer.recommendations.explanations.frequentVehicleChoice',
      explanationArgs: {
        category: topCategory,
        count: maxCount,
      },
      action: {
        type: RecommendationActionType.BOOK_NOW,
        href: `/bookings/new?vehicleClass=${encodeURIComponent(topCategory)}`,
        prefillParams: {
          vehicleClass: topCategory,
        },
      },
      metadata: {
        vehicleCategory: topCategory,
        tripCount: maxCount,
        preferenceRatio: Math.round(ratio * 100),
      },
    },
  ];
}
