import { RiskRuleResult, RiskSubjectType } from '../domain/risk-types';

export interface CancellationAbuseContext {
  subjectId: string;
  subjectType: 'CUSTOMER' | 'DRIVER';
  cancellationsLast24h: number;
  cancellationRate: number; // 0.0 to 1.0
  totalBookings24h: number;
}

export function evaluateCancellationAbuse(ctx: CancellationAbuseContext): RiskRuleResult {
  const evidence: string[] = [];
  let scoreContribution = 0;

  if (ctx.cancellationsLast24h >= 4 && ctx.cancellationRate > 0.5) {
    evidence.push(
      `High cancellation frequency (${ctx.cancellationsLast24h} cancellations out of ${ctx.totalBookings24h} bookings, ${(ctx.cancellationRate * 100).toFixed(0)}%)`,
    );
    scoreContribution += 35;
  }

  if (ctx.cancellationRate >= 0.8 && ctx.totalBookings24h >= 5) {
    evidence.push(
      `Abnormal cancellation ratio (${(ctx.cancellationRate * 100).toFixed(0)}% cancellation rate over last 24h)`,
    );
    scoreContribution += 30;
  }

  const triggered = scoreContribution >= 25;

  return {
    ruleId: 'CANCELLATION_ABUSE_RULE',
    ruleName: 'Cancellation Velocity & Ratio Rule',
    subjectType: ctx.subjectType as RiskSubjectType,
    triggered,
    scoreContribution: Math.min(scoreContribution, 65),
    evidence,
    confidence: ctx.cancellationRate > 0.7 ? 'HIGH' : 'MEDIUM',
    suggestedAction: triggered ? 'FLAG_FOR_REVIEW' : undefined,
  };
}
