export interface CouponSavingsPreview {
  code: string;
  isValid: boolean;
  discountType: 'PERCENTAGE' | 'FIXED' | 'FLAT';
  discountAmount: number;
  originalFare: number;
  finalEstimatedFare: number;
  savingsMessage: string;
  ineligibilityReason?: string;
}

export interface MembershipTierComparison {
  tierName: string;
  minPointsRequired: number;
  benefits: string[];
  isCurrentTier: boolean;
  pointsToNextTier: number;
}

export interface UnifiedOffersAndRewardsDTO {
  currentLoyaltyAccount: {
    pointsBalance: number;
    currentTier: string;
    pointsToNextTier: number;
    nextTierName: string;
    pointsExpiringSoon: number;
    pointsExpiryDate?: string | null;
  };
  tierComparisons: MembershipTierComparison[];
  activePromotions: Array<{
    id: string;
    code: string;
    name: string;
    description: string;
    discountType: string;
    discountValue: string;
    expiresAt: string | null;
  }>;
  availableRewards: Array<{
    id: string;
    title: string;
    description: string;
    pointsRequired: number;
    discountValue: string;
    isClaimable: boolean;
  }>;
  recentRedemptionHistory: Array<{
    id: string;
    rewardTitle: string;
    pointsSpent: number;
    redeemedAt: string;
    status: string;
  }>;
}
