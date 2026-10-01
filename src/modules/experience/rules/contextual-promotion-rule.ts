import type { CustomerExperienceContext } from '../domain/experience-context';
import type { ExperienceRecommendation } from '../domain/experience-types';

/**
 * Rule: Evaluates active promotions and discounts matching customer preferences
 * with explicit explainability reason.
 */
export function evaluateContextualPromotionRule(
  context: CustomerExperienceContext,
): ExperienceRecommendation | null {
  const { customerPreference } = context;
  const promotions = context.eligiblePromotions || (context as Record<string, any>).activePromotions || [];

  // Respect customer preference toggle
  if (
    customerPreference &&
    (customerPreference as Record<string, unknown>).promotionSuggestionsEnabled === false
  ) {
    return null;
  }

  if (!promotions || promotions.length === 0) {
    return null;
  }

  const promo = promotions[0];
  const code = promo.code || 'PROMO15';
  const title = promo.title || `Special Offer: ${code}`;
  const discountText = promo.discountValue
    ? promo.discountValue
    : promo.discountPercentage
      ? `${promo.discountPercentage}% Discount`
      : promo.discountAmount
        ? `₹${promo.discountAmount} OFF`
        : 'Special Discount';

  return {
    id: `rec-promo-${promo.id}`,
    type: 'PROMOTION',
    category: 'CUSTOMER',
    title: `${title} (${discountText})`,
    description: `Use promo code ${code} on your next driver booking.`,
    reason: `Why this suggestion? Exclusive ${discountText} offer eligible for your customer account.`,
    priority: 75,
    isDismissable: true,
    isMandatory: false,
    fingerprint: `promotion:${promo.id}:${code}`,
    action: {
      type: 'OPEN_BOOKING_PREFILLED',
      targetUrl: `/bookings/new?promoCode=${code}`,
      payload: {
        promoCode: code,
      },
    },
    createdAt: new Date().toISOString(),
  };
}
