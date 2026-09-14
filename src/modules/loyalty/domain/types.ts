import type {
  LoyaltyTierCode,
  LoyaltyTransactionType,
  LoyaltyRewardType,
  LoyaltyRewardStatus,
} from '@prisma/client';

export interface CustomerLoyaltySummary {
  customerId: string;
  currentPoints: number;
  lifetimeEarnedPoints: number;
  lifetimeRedeemedPoints: number;
  currentTier: {
    id: string;
    code: LoyaltyTierCode;
    name: string;
    pointMultiplier: number;
  };
  nextTier: {
    id: string;
    code: LoyaltyTierCode;
    name: string;
    minimumLifetimePoints: number;
    pointsNeeded: number;
    progressPercentage: number;
  } | null;
  tierUpgradedAt: string | null;
}

export interface LoyaltyPointTransactionDTO {
  id: string;
  type: LoyaltyTransactionType;
  points: number;
  balanceAfter: number;
  bookingId: string | null;
  rewardId: string | null;
  referenceId: string | null;
  description: string;
  expiresAt: string | null;
  createdAt: string;
}

export interface LoyaltyRewardDTO {
  id: string;
  title: string;
  description: string | null;
  rewardType: LoyaltyRewardType;
  pointsRequired: number;
  minimumTier: {
    id: string;
    code: LoyaltyTierCode;
    name: string;
  } | null;
  promotionId: string | null;
  discountValue: number | null;
  status: LoyaltyRewardStatus;
  canRedeem: boolean;
  lockReason: string | null;
}

export interface CreateLoyaltyRewardInput {
  title: string;
  description?: string | null;
  rewardType: LoyaltyRewardType;
  pointsRequired: number;
  minimumTierCode?: LoyaltyTierCode | null;
  promotionId?: string | null;
  discountValue?: number | string | null;
  status?: LoyaltyRewardStatus;
  startsAt?: Date | string;
  expiresAt?: Date | string | null;
  totalRedemptionLimit?: number | null;
  perCustomerLimit?: number;
}

export interface AdjustCustomerPointsInput {
  customerId: string;
  points: number;
  direction: 'ADD' | 'DEDUCT';
  reason: string;
  adminUserId: string;
}
