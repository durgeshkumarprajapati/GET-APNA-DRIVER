import { RiskRuleResult } from '../domain/risk-types';

export interface LocationAnomalyContext {
  driverId: string;
  impossibleMovementSpeedKmh: number;
  locationJumpKm: number;
  staleTelemetryMinutes: number;
  isActiveRide: boolean;
}

export function evaluateLocationAnomaly(ctx: LocationAnomalyContext): RiskRuleResult {
  const evidence: string[] = [];
  let scoreContribution = 0;

  if (ctx.impossibleMovementSpeedKmh > 200) {
    evidence.push(
      `Physically impossible movement detected (${ctx.impossibleMovementSpeedKmh.toFixed(0)} km/h calculated speed)`,
    );
    scoreContribution += 50;
  }

  if (ctx.locationJumpKm > 50) {
    evidence.push(
      `Teleportation or GPS location jump detected (${ctx.locationJumpKm.toFixed(1)} km coordinate displacement)`,
    );
    scoreContribution += 40;
  }

  if (ctx.staleTelemetryMinutes >= 15 && ctx.isActiveRide) {
    evidence.push(
      `Stale GPS telemetry during active trip (${ctx.staleTelemetryMinutes}m without location update)`,
    );
    scoreContribution += 30;
  }

  const triggered = scoreContribution >= 25;

  return {
    ruleId: 'LOCATION_ANOMALY_RULE',
    ruleName: 'Telemetry & Impossible Movement Rule',
    subjectType: 'DRIVER',
    triggered,
    scoreContribution: Math.min(scoreContribution, 80),
    evidence,
    confidence:
      ctx.impossibleMovementSpeedKmh > 250 || ctx.locationJumpKm > 100 ? 'HIGH' : 'MEDIUM',
    suggestedAction: triggered ? 'LIMIT_DISPATCH_OFFERS' : undefined,
  };
}
