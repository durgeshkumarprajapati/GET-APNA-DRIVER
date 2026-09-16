import { RiskRuleResult, RiskSubjectType } from '../domain/risk-types';

export interface AccountAbuseContext {
  userId: string;
  subjectType: RiskSubjectType;
  otpFailuresLast24h: number;
  loginAttemptsLast1h: number;
  multipleDevicesDetected: boolean;
}

export function evaluateAccountAbuse(ctx: AccountAbuseContext): RiskRuleResult {
  const evidence: string[] = [];
  let scoreContribution = 0;

  if (ctx.otpFailuresLast24h >= 5) {
    evidence.push(`Repeated OTP verification failures (${ctx.otpFailuresLast24h} in 24h)`);
    scoreContribution += Math.min(ctx.otpFailuresLast24h * 10, 40);
  }

  if (ctx.loginAttemptsLast1h >= 10) {
    evidence.push(`Unusually high login attempt velocity (${ctx.loginAttemptsLast1h} in 1h)`);
    scoreContribution += 30;
  }

  if (ctx.multipleDevicesDetected) {
    evidence.push('Concurrent sessions across multiple distinct device fingerprints');
    scoreContribution += 15;
  }

  const triggered = scoreContribution >= 20;

  return {
    ruleId: 'ACCOUNT_ABUSE_RULE',
    ruleName: 'Account & Session Anomaly Rule',
    subjectType: ctx.subjectType,
    triggered,
    scoreContribution: Math.min(scoreContribution, 60),
    evidence,
    confidence: ctx.otpFailuresLast24h >= 10 ? 'HIGH' : scoreContribution >= 30 ? 'MEDIUM' : 'LOW',
    suggestedAction: triggered ? 'FLAG_FOR_REVIEW' : undefined,
  };
}
