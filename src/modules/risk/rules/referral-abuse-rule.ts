import { RiskRuleResult } from '../domain/risk-types';

export interface ReferralAbuseContext {
  referrerId: string;
  refereeId: string;
  isSameUserOrDevice: boolean;
  circularReferralDetected: boolean;
  rapidReferralCount24h: number;
}

export function evaluateReferralAbuse(ctx: ReferralAbuseContext): RiskRuleResult {
  const evidence: string[] = [];
  let scoreContribution = 0;

  if (ctx.isSameUserOrDevice) {
    evidence.push('Self-referral or shared device fingerprint between referrer and referee');
    scoreContribution += 55;
  }

  if (ctx.circularReferralDetected) {
    evidence.push('Circular referral loop detected between connected accounts');
    scoreContribution += 65;
  }

  if (ctx.rapidReferralCount24h >= 8) {
    evidence.push(
      `Suspicious referral cluster volume (${ctx.rapidReferralCount24h} redemptions in 24h)`,
    );
    scoreContribution += 35;
  }

  const triggered = scoreContribution >= 25;

  return {
    ruleId: 'REFERRAL_ABUSE_RULE',
    ruleName: 'Referral Cluster & Self-Referral Rule',
    subjectType: 'REFERRAL',
    triggered,
    scoreContribution: Math.min(scoreContribution, 80),
    evidence,
    confidence: ctx.circularReferralDetected || ctx.isSameUserOrDevice ? 'HIGH' : 'MEDIUM',
    suggestedAction: triggered ? 'FLAG_FOR_REVIEW' : undefined,
  };
}
