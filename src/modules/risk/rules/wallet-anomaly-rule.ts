import { RiskRuleResult, RiskSubjectType } from '../domain/risk-types';

export interface WalletAnomalyContext {
  userId: string;
  subjectType: 'CUSTOMER' | 'DRIVER';
  abnormalRewardCredit24h: number;
  unexpectedTransactionVelocity1h: number;
  unresolvedBalanceDiscrepancy: boolean;
}

export function evaluateWalletAnomaly(ctx: WalletAnomalyContext): RiskRuleResult {
  const evidence: string[] = [];
  let scoreContribution = 0;

  if (ctx.abnormalRewardCredit24h >= 5000) {
    evidence.push(
      `Abnormal reward/credit intake velocity (₹${ctx.abnormalRewardCredit24h} in 24h)`,
    );
    scoreContribution += 40;
  }

  if (ctx.unexpectedTransactionVelocity1h >= 8) {
    evidence.push(
      `Unusual wallet transaction frequency (${ctx.unexpectedTransactionVelocity1h} entries in 1h)`,
    );
    scoreContribution += 30;
  }

  if (ctx.unresolvedBalanceDiscrepancy) {
    evidence.push('Unresolved ledger balance discrepancy detected on wallet account');
    scoreContribution += 45;
  }

  const triggered = scoreContribution >= 25;

  return {
    ruleId: 'WALLET_ANOMALY_RULE',
    ruleName: 'Wallet Credit & Transaction Velocity Rule',
    subjectType: ctx.subjectType as RiskSubjectType,
    triggered,
    scoreContribution: Math.min(scoreContribution, 75),
    evidence,
    confidence: ctx.unresolvedBalanceDiscrepancy
      ? 'HIGH'
      : scoreContribution >= 40
        ? 'MEDIUM'
        : 'LOW',
    suggestedAction: triggered ? 'REQUIRE_STEP_UP' : undefined,
  };
}
