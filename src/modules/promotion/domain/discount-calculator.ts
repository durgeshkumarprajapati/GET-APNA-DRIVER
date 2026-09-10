import { Prisma } from '@prisma/client';
import { ZERO, roundMoney, toDecimal } from '@/modules/finance/domain/money';
import type { PromotionDiscountType } from './types';

export interface DiscountCalculatorInput {
  discountType: PromotionDiscountType;
  discountValue: string | Prisma.Decimal;
  maxDiscountAmount: string | Prisma.Decimal | null;
  fareAmount: string | Prisma.Decimal;
}

/**
 * Pure, server-authoritative discount computation — the client never
 * supplies a discountAmount that is trusted directly (see
 * promotion-eligibility-service.ts). Given a fare and a promotion's frozen
 * terms, always recomputes the discount from scratch. Never returns more
 * than the fare itself (a discount can reduce the charge to zero, never
 * negative).
 */
export function calculateDiscountAmount(input: DiscountCalculatorInput): string {
  const fare = toDecimal(input.fareAmount);
  const value = toDecimal(input.discountValue);

  let discount =
    input.discountType === 'PERCENTAGE' ? roundMoney(fare.mul(value).div(100)) : roundMoney(value);

  if (input.maxDiscountAmount) {
    const cap = toDecimal(input.maxDiscountAmount);
    if (discount.greaterThan(cap)) {
      discount = cap;
    }
  }

  if (discount.greaterThan(fare)) {
    discount = fare;
  }
  if (discount.lessThan(ZERO)) {
    discount = ZERO;
  }

  return discount.toFixed(4);
}
