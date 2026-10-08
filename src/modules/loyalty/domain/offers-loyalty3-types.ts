export interface AvailableOfferCardDTO {
  id: string;
  code: string;
  badgeText: string; // e.g. "₹200 OFF" or "20% OFF"
  title: string;
  description: string;
  expiryDaysRemaining: number;
  isEligible: boolean;
  ineligibilityReason?: string;
}

export interface UnifiedOffersLoyalty3DTO {
  availableOffers: AvailableOfferCardDTO[];
  membershipCard: {
    tierName: string;
    pointsBalance: number;
    pointsToNextReward: number;
    nextRewardProgressPercent: number;
    actionableText: string; // e.g. "Gold Member: ₹150 away from next reward"
  };
}
