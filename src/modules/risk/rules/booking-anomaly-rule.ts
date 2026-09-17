import { RiskRuleResult } from '../domain/risk-types';

export interface BookingAnomalyContext {
  bookingId?: string;
  customerId: string;
  bookingVelocity1h: number;
  failedAssignments24h: number;
  unusualRoutePattern: boolean;
}

export function evaluateBookingAnomaly(ctx: BookingAnomalyContext): RiskRuleResult {
  const evidence: string[] = [];
  let scoreContribution = 0;

  if (ctx.bookingVelocity1h >= 5) {
    evidence.push(
      `Unusually high booking velocity (${ctx.bookingVelocity1h} bookings created in 1h)`,
    );
    scoreContribution += 35;
  }

  if (ctx.failedAssignments24h >= 4) {
    evidence.push(
      `Repeated failed assignment attempts (${ctx.failedAssignments24h} unfulfilled requests in 24h)`,
    );
    scoreContribution += 25;
  }

  if (ctx.unusualRoutePattern) {
    evidence.push('Irregular route coordinate or pick-up distance anomaly detected');
    scoreContribution += 20;
  }

  const triggered = scoreContribution >= 25;

  return {
    ruleId: 'BOOKING_ANOMALY_RULE',
    ruleName: 'Booking Velocity & Pattern Rule',
    subjectType: 'BOOKING',
    triggered,
    scoreContribution: Math.min(scoreContribution, 70),
    evidence,
    confidence: ctx.bookingVelocity1h >= 8 ? 'HIGH' : scoreContribution >= 35 ? 'MEDIUM' : 'LOW',
    suggestedAction: triggered ? 'FLAG_FOR_REVIEW' : undefined,
  };
}
