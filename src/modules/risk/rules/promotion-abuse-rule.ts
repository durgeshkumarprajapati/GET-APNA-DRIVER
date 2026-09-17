import { RiskRuleResult } from '../domain/risk-types';

export interface PromotionAbuseContext {
  promotionId: string;
  userId: string;
  failedPromoAttempts1h: number;
  promoUsage24h: number;
  unusualPromoRelationships: boolean;
}

export function evaluatePromotionAbuse(ctx: PromotionAbuseContext): RiskRuleResult {
  const evidence: string[] = [];
  let scoreContribution = 0;

  if (ctx.failedPromoAttempts1h >= 5) {
    evidence.push(
      `Repeated coupon guessing or failed promotion attempts (${ctx.failedPromoAttempts1h} in 1h)`,
    );
    scoreContribution += 35;
  }

  if (ctx.promoUsage24h >= 6) {
    evidence.push(`Excessive promotion usage pattern (${ctx.promoUsage24h} codes applied in 24h)`);
    scoreContribution += 30;
  }

  if (ctx.unusualPromoRelationships) {
    evidence.push('Unusual cross-account promotion usage network detected');
    scoreContribution += 40;
  }

  const triggered = scoreContribution >= 25;

  return {
    ruleId: 'PROMOTION_ABUSE_RULE',
    ruleName: 'Promotion Velocity & Stacking Rule',
    subjectType: 'PROMOTION',
    triggered,
    scoreContribution: Math.min(scoreContribution, 75),
    evidence,
    confidence:
      ctx.failedPromoAttempts1h >= 10 ? 'HIGH' : scoreContribution >= 40 ? 'MEDIUM' : 'LOW',
    suggestedAction: triggered ? 'FLAG_FOR_REVIEW' : undefined,
  };
}
