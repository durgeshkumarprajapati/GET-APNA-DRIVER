import 'server-only';

export type MarketplaceHealthState =
  'HEALTHY' | 'WATCH' | 'STRAINED' | 'CRITICAL' | 'INSUFFICIENT_DATA';

export interface MarketplaceHealthEvaluation {
  healthState: MarketplaceHealthState;
  healthScore: number; // 0 to 100
  metrics: {
    supplyDemandRatio: number;
    completionRate: number;
    cancellationRate: number;
    assignmentSuccessRate: number;
    dispatchLatencyP50Ms: number;
  };
  explanation: string;
  evaluatedAt: string;
}

export const HEALTH_THRESHOLDS = {
  CRITICAL_CANCELLATION_RATE: 25.0, // > 25% cancellation = CRITICAL
  STRAINED_CANCELLATION_RATE: 15.0, // > 15% cancellation = STRAINED
  WATCH_CANCELLATION_RATE: 10.0, // > 10% cancellation = WATCH

  CRITICAL_SUPPLY_RATIO: 0.5, // < 0.5 ratio = CRITICAL
  STRAINED_SUPPLY_RATIO: 0.8, // < 0.8 ratio = STRAINED
  WATCH_SUPPLY_RATIO: 1.0, // < 1.0 ratio = WATCH

  MIN_REQUESTS_FOR_EVALUATION: 1,
};

/**
 * Evaluates marketplace health deterministically based on centralized thresholds.
 */
export function evaluateMarketplaceHealth(params: {
  totalRequests: number;
  completedRides: number;
  cancelledRides: number;
  dispatchEligibleSupply: number;
  assignmentSuccessRate?: number;
  dispatchLatencyP50Ms?: number;
}): MarketplaceHealthEvaluation {
  const { totalRequests, completedRides, cancelledRides, dispatchEligibleSupply } = params;

  if (totalRequests < HEALTH_THRESHOLDS.MIN_REQUESTS_FOR_EVALUATION) {
    return {
      healthState: 'INSUFFICIENT_DATA',
      healthScore: 100,
      metrics: {
        supplyDemandRatio: dispatchEligibleSupply > 0 ? 10.0 : 1.0,
        completionRate: 100,
        cancellationRate: 0,
        assignmentSuccessRate: 100,
        dispatchLatencyP50Ms: 0,
      },
      explanation:
        'Insufficient ride request volume in this window to evaluate marketplace health.',
      evaluatedAt: new Date().toISOString(),
    };
  }

  const completionRate = Number(((completedRides / totalRequests) * 100).toFixed(1));
  const cancellationRate = Number(((cancelledRides / totalRequests) * 100).toFixed(1));
  const supplyDemandRatio = Number((dispatchEligibleSupply / totalRequests).toFixed(2));
  const assignmentSuccessRate = params.assignmentSuccessRate ?? completionRate;
  const dispatchLatencyP50Ms = params.dispatchLatencyP50Ms ?? 1500;

  let healthState: MarketplaceHealthState = 'HEALTHY';
  let penalty = 0;

  // Cancellation penalty
  if (cancellationRate >= HEALTH_THRESHOLDS.CRITICAL_CANCELLATION_RATE) {
    penalty += 40;
  } else if (cancellationRate >= HEALTH_THRESHOLDS.STRAINED_CANCELLATION_RATE) {
    penalty += 25;
  } else if (cancellationRate >= HEALTH_THRESHOLDS.WATCH_CANCELLATION_RATE) {
    penalty += 10;
  }

  // Supply penalty
  if (supplyDemandRatio < HEALTH_THRESHOLDS.CRITICAL_SUPPLY_RATIO) {
    penalty += 40;
  } else if (supplyDemandRatio < HEALTH_THRESHOLDS.STRAINED_SUPPLY_RATIO) {
    penalty += 25;
  } else if (supplyDemandRatio < HEALTH_THRESHOLDS.WATCH_SUPPLY_RATIO) {
    penalty += 10;
  }

  const healthScore = Math.max(0, 100 - penalty);

  if (healthScore < 50 || cancellationRate >= 25 || supplyDemandRatio < 0.5) {
    healthState = 'CRITICAL';
  } else if (healthScore < 70 || cancellationRate >= 15 || supplyDemandRatio < 0.8) {
    healthState = 'STRAINED';
  } else if (healthScore < 85 || cancellationRate >= 10 || supplyDemandRatio < 1.0) {
    healthState = 'WATCH';
  } else {
    healthState = 'HEALTHY';
  }

  let explanation = '';
  if (healthState === 'HEALTHY') {
    explanation = `Marketplace is operating normally with ${supplyDemandRatio}x supply/demand ratio and ${cancellationRate}% cancellation rate.`;
  } else if (healthState === 'WATCH') {
    explanation = `Marketplace health requires monitoring due to slight supply deficit (${supplyDemandRatio}x) or elevated cancellations (${cancellationRate}%).`;
  } else if (healthState === 'STRAINED') {
    explanation = `Marketplace is under strain. Supply/demand ratio is ${supplyDemandRatio}x with a ${cancellationRate}% cancellation rate.`;
  } else {
    explanation = `CRITICAL MARKETPLACE ALERT: Severe supply shortage (${supplyDemandRatio}x) or extreme cancellation rate (${cancellationRate}%). Operations intervention advised.`;
  }

  return {
    healthState,
    healthScore,
    metrics: {
      supplyDemandRatio,
      completionRate,
      cancellationRate,
      assignmentSuccessRate,
      dispatchLatencyP50Ms,
    },
    explanation,
    evaluatedAt: new Date().toISOString(),
  };
}
