import { RiskRuleResult, RiskSubjectType } from '../domain/risk-types';

export interface SupportAbuseContext {
  userId: string;
  subjectType: 'CUSTOMER' | 'DRIVER';
  refundTickets24h: number;
  unsubstantiatedDisputes24h: number;
  abusiveLanguageFlag: boolean;
}

export function evaluateSupportAbuse(ctx: SupportAbuseContext): RiskRuleResult {
  const evidence: string[] = [];
  let scoreContribution = 0;

  if (ctx.refundTickets24h >= 4) {
    evidence.push(
      `Excessive refund claims lodged via support (${ctx.refundTickets24h} claims in 24h)`,
    );
    scoreContribution += 35;
  }

  if (ctx.unsubstantiatedDisputes24h >= 3) {
    evidence.push(
      `Repeated unsubstantiated dispute submissions (${ctx.unsubstantiatedDisputes24h} in 24h)`,
    );
    scoreContribution += 30;
  }

  if (ctx.abusiveLanguageFlag) {
    evidence.push('Automated policy violation flag triggered in support communications');
    scoreContribution += 20;
  }

  const triggered = scoreContribution >= 25;

  return {
    ruleId: 'SUPPORT_ABUSE_RULE',
    ruleName: 'Support Claim & Dispute Frequency Rule',
    subjectType: ctx.subjectType as RiskSubjectType,
    triggered,
    scoreContribution: Math.min(scoreContribution, 65),
    evidence,
    confidence: ctx.refundTickets24h >= 6 ? 'HIGH' : scoreContribution >= 35 ? 'MEDIUM' : 'LOW',
    suggestedAction: triggered ? 'FLAG_FOR_REVIEW' : undefined,
  };
}
