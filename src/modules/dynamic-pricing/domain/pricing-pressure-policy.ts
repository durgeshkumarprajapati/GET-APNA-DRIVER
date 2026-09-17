import type {
  PricingPressureLevel,
  PressureEvaluationResult,
  DynamicPricingPolicyDTO,
  DynamicPricingEvaluationResult,
} from './pricing-pressure-types';

/**
 * Pure domain function converting supply/demand signals into a deterministic pressure level.
 * High supply/demand ratio (> 1.2) = NORMAL pressure.
 * Low ratio (< 0.5) = CRITICAL pressure.
 */
export function calculatePressureFromSignals(metrics: {
  supplyDemandRatio: number;
  healthScore: number;
  demandTrendPercent?: number;
  expectedEligibleSupply?: number;
  forecastedDemand?: number;
}): PressureEvaluationResult {
  const ratio = metrics.supplyDemandRatio;
  const trend = metrics.demandTrendPercent ?? 0;
  const health = metrics.healthScore;

  let pressureLevel: PricingPressureLevel = 'NORMAL';
  let reason = 'Marketplace supply and demand are in equilibrium.';

  if (ratio <= 0.4 || (ratio <= 0.6 && trend >= 25) || health < 40) {
    pressureLevel = 'CRITICAL';
    reason = `Critical supply shortage (ratio: ${ratio.toFixed(2)}, demand trend: +${trend.toFixed(1)}%).`;
  } else if (ratio <= 0.75 || (ratio <= 0.9 && trend >= 15) || health < 60) {
    pressureLevel = 'HIGH';
    reason = `High demand pressure (ratio: ${ratio.toFixed(2)}, health score: ${health}).`;
  } else if (ratio <= 1.1 || trend >= 10) {
    pressureLevel = 'ELEVATED';
    reason = `Elevated demand (ratio: ${ratio.toFixed(2)}).`;
  } else {
    pressureLevel = 'NORMAL';
    reason = `Normal supply availability (ratio: ${ratio.toFixed(2)}).`;
  }

  return {
    pressureLevel,
    supplyDemandRatio: ratio,
    healthScore: health,
    demandTrendPercent: trend,
    expectedEligibleSupply: metrics.expectedEligibleSupply ?? 0,
    forecastedDemand: metrics.forecastedDemand ?? 0,
    reason,
  };
}

/**
 * Maps numeric pressure levels for boundary checks.
 */
export function pressureLevelToRank(level: PricingPressureLevel): number {
  switch (level) {
    case 'NORMAL':
      return 1;
    case 'ELEVATED':
      return 2;
    case 'HIGH':
      return 3;
    case 'CRITICAL':
      return 4;
  }
}

/**
 * Pure domain function computing exact dynamic fare adjustment using an active policy.
 * Enforces hard maximum adjustment caps.
 */
export function calculatePolicyAdjustment(
  baseFareAmount: number,
  pressureState: PricingPressureLevel,
  policy: DynamicPricingPolicyDTO | null,
): DynamicPricingEvaluationResult {
  if (!policy || baseFareAmount <= 0) {
    return {
      baseFareAmount,
      dynamicAdjustmentAmount: 0,
      finalGrossFareAmount: baseFareAmount,
      appliedPolicyId: policy?.id ?? null,
      appliedPolicyVersion: policy?.version ?? null,
      appliedPolicyName: policy?.name ?? null,
      pressureState,
      adjustmentPercentage: 0,
      flatSurgeAmount: 0,
      wasCapped: false,
    };
  }

  const currentRank = pressureLevelToRank(pressureState);
  const minRank = pressureLevelToRank(policy.minimumPressure);
  const maxRank = pressureLevelToRank(policy.maximumPressure);

  // If current pressure is below policy minimum threshold, no surge applies
  if (currentRank < minRank || currentRank > maxRank) {
    return {
      baseFareAmount,
      dynamicAdjustmentAmount: 0,
      finalGrossFareAmount: baseFareAmount,
      appliedPolicyId: policy.id,
      appliedPolicyVersion: policy.version,
      appliedPolicyName: policy.name,
      pressureState,
      adjustmentPercentage: 0,
      flatSurgeAmount: 0,
      wasCapped: false,
    };
  }

  const percentageAdj = (baseFareAmount * policy.adjustmentPercentage) / 100;
  const rawAdjustment = percentageAdj + policy.flatSurgeAmount;

  // Enforce server-side maxAdjustmentPercentage policy cap
  const policyCappedAdjustment = Math.min(rawAdjustment, (baseFareAmount * policy.maxAdjustmentPercentage) / 100);

  // Enforce ABSOLUTE SERVER-SIDE HARD SAFETY BOUNDS: MIN 0.5x, MAX 3.0x
  // 0.5x minimum multiplier => dynamicAdjustment >= -0.5 * baseFare
  // 3.0x maximum multiplier => dynamicAdjustment <= +2.0 * baseFare
  const minAllowedAdjustment = -0.5 * baseFareAmount;
  const maxAllowedAdjustment = 2.0 * baseFareAmount;

  const dynamicAdjustmentAmount = Math.max(
    minAllowedAdjustment,
    Math.min(policyCappedAdjustment, maxAllowedAdjustment),
  );
  const wasCapped = rawAdjustment > dynamicAdjustmentAmount;
  const finalGrossFareAmount = baseFareAmount + dynamicAdjustmentAmount;

  return {
    baseFareAmount,
    dynamicAdjustmentAmount: Number(dynamicAdjustmentAmount.toFixed(4)),
    finalGrossFareAmount: Number(finalGrossFareAmount.toFixed(4)),
    appliedPolicyId: policy.id,
    appliedPolicyVersion: policy.version,
    appliedPolicyName: policy.name,
    pressureState,
    adjustmentPercentage: policy.adjustmentPercentage,
    flatSurgeAmount: policy.flatSurgeAmount,
    wasCapped,
    capReason: wasCapped
      ? `Adjustment clamped within server-side policy and safety limits (0.5x–3.0x max).`
      : undefined,
  };
}
