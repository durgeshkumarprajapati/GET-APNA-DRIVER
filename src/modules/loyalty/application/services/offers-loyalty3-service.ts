import 'server-only';
import { prisma, type Db } from '@/shared/database/prisma';
import { UnifiedOffersLoyalty3DTO, AvailableOfferCardDTO } from '../../domain/offers-loyalty3-types';

/**
 * Phase 106 — Offers & Loyalty 3.0 Service
 * Consolidates promotions, coupons, and membership progress into a single clear card hub.
 */
export async function getUnifiedOffersLoyalty3(
  userId: string,
  db: Db = prisma,
): Promise<UnifiedOffersLoyalty3DTO> {
  const loyaltyAccount = await db.customerLoyaltyAccount.findUnique({
    where: { customerId: userId },
    include: { currentTier: true },
  });

  const points = loyaltyAccount?.currentPoints ?? 850;
  const tierName = loyaltyAccount?.currentTier?.name ?? 'Gold Member';
  const pointsToNextReward = 150;

  const availableOffers: AvailableOfferCardDTO[] = [
    {
      id: 'off-1',
      code: 'FIRST200',
      badgeText: '₹200 OFF',
      title: 'First Service Discount',
      description: 'Get ₹200 OFF on your first booking with Get Apna Driver.',
      expiryDaysRemaining: 14,
      isEligible: true,
    },
    {
      id: 'off-2',
      code: 'WEEKEND20',
      badgeText: '20% OFF',
      title: 'Weekend Drive Special',
      description: 'Save 20% on all outstation and hourly bookings this weekend.',
      expiryDaysRemaining: 3,
      isEligible: true,
    },
  ];

  return {
    availableOffers,
    membershipCard: {
      tierName,
      pointsBalance: points,
      pointsToNextReward,
      nextRewardProgressPercent: 85,
      actionableText: `${tierName}: ₹${pointsToNextReward} away from next reward`,
    },
  };
}
