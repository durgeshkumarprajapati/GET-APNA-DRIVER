import { RiskRuleResult } from '../domain/risk-types';

export interface DriverBehaviorContext {
  driverId: string;
  rejectedAssignments24h: number;
  unusualTripDeviations: number;
  lowRatingSpike: boolean;
}

export function evaluateDriverBehavior(ctx: DriverBehaviorContext): RiskRuleResult {
  const evidence: string[] = [];
  let scoreContribution = 0;

  if (ctx.rejectedAssignments24h >= 6) {
    evidence.push(
      `Repeated dispatch assignment rejections (${ctx.rejectedAssignments24h} consecutive rejections in 24h)`,
    );
    scoreContribution += 30;
  }

  if (ctx.unusualTripDeviations >= 3) {
    evidence.push(
      `Off-route route deviations detected (${ctx.unusualTripDeviations} unexplained route deviations)`,
    );
    scoreContribution += 35;
  }

  if (ctx.lowRatingSpike) {
    evidence.push('Sudden spike in low customer ratings or safety feedback');
    scoreContribution += 25;
  }

  const triggered = scoreContribution >= 25;

  return {
    ruleId: 'DRIVER_BEHAVIOR_RULE',
    ruleName: 'Driver Dispatch & Behavioral Pattern Rule',
    subjectType: 'DRIVER',
    triggered,
    scoreContribution: Math.min(scoreContribution, 70),
    evidence,
    confidence:
      ctx.rejectedAssignments24h >= 10 ? 'HIGH' : scoreContribution >= 35 ? 'MEDIUM' : 'LOW',
    suggestedAction: triggered ? 'FLAG_FOR_REVIEW' : undefined,
  };
}
