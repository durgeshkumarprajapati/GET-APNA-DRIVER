import type { CustomerExperienceContext } from '../domain/experience-context';
import type { ExperienceRecommendation } from '../domain/experience-types';
import {
  buildRecommendation,
  createExperienceFingerprint,
} from '../domain/experience-recommendation';
import { EXPERIENCE_PRIORITY_WEIGHTS } from '../domain/experience-policy';

export function evaluatePromotionRule(
  context: CustomerExperienceContext,
): ExperienceRecommendation | null {
  if (!context.eligiblePromotions || context.eligiblePromotions.length === 0) {
    return null;
  }

  const promo = context.eligiblePromotions[0];
  const fingerprint = createExperienceFingerprint(context.userId, 'PROMOTION', promo.code);

  return buildRecommendation({
    type: 'PROMOTION',
    category: 'CUSTOMER',
    title: `Save with Code ${promo.code}`,
    description: `${promo.title}: ${promo.discountValue} instant discount on your next chauffeur booking.`,
    reason: 'Eligible promo code in customer catalog',
    priority: EXPERIENCE_PRIORITY_WEIGHTS.PROMOTION,
    isDismissable: true,
    isMandatory: false,
    fingerprint,
    action: {
      type: 'NAVIGATE_PAGE',
      targetUrl: '/customer/offers',
      payload: {
        code: promo.code,
        discountValue: promo.discountValue,
      },
    },
    metadata: {
      code: promo.code,
    },
  });
}
