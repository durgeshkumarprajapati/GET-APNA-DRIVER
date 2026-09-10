import type { PromotionDiscountType, PromotionStatus } from '@prisma/client';

export type { PromotionDiscountType, PromotionStatus };

export interface PromotionSummary {
  id: string;
  code: string | null;
  name: string;
  description: string | null;
  discountType: PromotionDiscountType;
  discountValue: string;
  maxDiscountAmount: string | null;
  minBookingValue: string | null;
  firstRideOnly: boolean;
  isAutomatic: boolean;
  status: PromotionStatus;
  /** True when status is ACTIVE but endsAt has passed — see promotion-state-machine.ts. */
  isExpired: boolean;
  startsAt: string;
  endsAt: string | null;
  totalUsageLimit: number | null;
  totalUsageCount: number;
  perUserUsageLimit: number | null;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
}

/** Result of a server-authoritative discount calculation for a specific fare amount. */
export interface DiscountCalculationResult {
  discountAmount: string;
  discountType: PromotionDiscountType;
  discountValue: string;
}

/** One entry in the customer-facing offers list — a Promotion plus this customer's usage state against it. */
export interface CustomerOfferView extends PromotionSummary {
  usedByCustomerCount: number;
  remainingUsesForCustomer: number | null;
}

export interface PromotionUsageSummary {
  id: string;
  promotionId: string;
  userId: string;
  bookingId: string;
  discountAmount: string;
  promotionCodeSnapshot: string | null;
  discountTypeSnapshot: PromotionDiscountType;
  discountValueSnapshot: string;
  createdAt: string;
}

export interface PromotionAnalytics {
  totalPromotions: number;
  activePromotions: number;
  totalRedemptions: number;
  totalDiscountAmount: string;
  generatedAt: string;
}
