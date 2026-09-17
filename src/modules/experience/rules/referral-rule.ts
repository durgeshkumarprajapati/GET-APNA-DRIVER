import type { CustomerExperienceContext } from '../domain/experience-context';
import type { ExperienceRecommendation } from '../domain/experience-types';
import {
  buildRecommendation,
  createExperienceFingerprint,
} from '../domain/experience-recommendation';
import { EXPERIENCE_PRIORITY_WEIGHTS } from '../domain/experience-policy';

export function evaluateReferralRule(
  context: CustomerExperienceContext,
): ExperienceRecommendation | null {
  if (!context.referralCode) {
    return null;
  }

  const { code, referralsCompleted, totalEarned } = context.referralCode;
  const fingerprint = createExperienceFingerprint(context.userId, 'REFERRAL', code);

  return buildRecommendation({
    type: 'REFERRAL',
    category: 'CUSTOMER',
    title: `Invite Friends & Earn Free Rides`,
    description: `Share code ${code}. You've earned ${totalEarned} across ${referralsCompleted} successful referrals.`,
    reason: 'Referral program eligibility active',
    priority: EXPERIENCE_PRIORITY_WEIGHTS.REFERRAL,
    isDismissable: true,
    isMandatory: false,
    fingerprint,
    action: {
      type: 'COPY_REFERRAL',
      targetUrl: '/customer/referral',
      payload: {
        code,
        referralsCompleted,
      },
    },
    metadata: {
      code,
    },
  });
}
