import { RiskRuleResult } from '../domain/risk-types';

export interface PaymentAnomalyContext {
  paymentId?: string;
  userId: string;
  failedPayments24h: number;
  paymentRetryFrequency1h: number;
  refundAnomaliesDetected: boolean;
  paymentStateMismatch: boolean;
}

export function evaluatePaymentAnomaly(ctx: PaymentAnomalyContext): RiskRuleResult {
  const evidence: string[] = [];
  let scoreContribution = 0;

  if (ctx.failedPayments24h >= 3) {
    evidence.push(
      `Repeated payment gateway failures (${ctx.failedPayments24h} failed attempts in 24h)`,
    );
    scoreContribution += 25;
  }

  if (ctx.paymentRetryFrequency1h >= 5) {
    evidence.push(
      `High-frequency payment retry sequence (${ctx.paymentRetryFrequency1h} retries in 1h)`,
    );
    scoreContribution += 35;
  }

  if (ctx.refundAnomaliesDetected) {
    evidence.push('Disproportionate refund requests or duplicate transaction refund patterns');
    scoreContribution += 45;
  }

  if (ctx.paymentStateMismatch) {
    evidence.push('Unresolved payment ledger state mismatch between gateway and database');
    scoreContribution += 50;
  }

  const triggered = scoreContribution >= 25;

  return {
    ruleId: 'PAYMENT_ANOMALY_RULE',
    ruleName: 'Payment Gateway & Refund Anomaly Rule',
    subjectType: 'PAYMENT',
    triggered,
    scoreContribution: Math.min(scoreContribution, 85),
    evidence,
    confidence:
      ctx.paymentStateMismatch || ctx.failedPayments24h >= 5
        ? 'HIGH'
        : scoreContribution >= 40
          ? 'MEDIUM'
          : 'LOW',
    suggestedAction: triggered ? 'REQUIRE_STEP_UP' : undefined,
  };
}
