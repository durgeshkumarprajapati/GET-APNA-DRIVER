import 'server-only';
import { prisma, type Db } from '@/shared/database/prisma';
import { findActivePricingPolicy } from '../infrastructure/pricing-policy-repository';
import { getMarketplacePressure } from './pricing-pressure-service';
import { calculatePolicyAdjustment, calculatePressureFromSignals } from '../domain/pricing-pressure-policy';
import type {
  DynamicPricingEvaluationInput,
  DynamicPricingEvaluationResult,
  DynamicPricingSimulationInput,
  DynamicPricingSimulationResult,
} from '../domain/pricing-pressure-types';

/**
 * Authoritative service evaluating Controlled Dynamic Pricing adjustments for fare calculation.
 * Preserves src/modules/pricing/ as the sole fare authority and operates BEFORE commission calculation.
 */
export async function evaluateDynamicPricing(
  input: DynamicPricingEvaluationInput,
  db: Db = prisma,
): Promise<DynamicPricingEvaluationResult> {
  const { baseFareAmount, bookingType, zoneId, effectiveTime } = input;
  const now = effectiveTime ?? new Date();

  // 1. Fetch Marketplace Intelligence pressure state
  const pressure = await getMarketplacePressure(zoneId, undefined, db);

  // 2. Retrieve active dynamic pricing policy matching zone/bookingType
  const activePolicy = await findActivePricingPolicy(bookingType, zoneId, now, db);

  // 3. Compute deterministic policy adjustment subject to max cap
  return calculatePolicyAdjustment(baseFareAmount, pressure.pressureLevel, activePolicy);
}

/**
 * Dry-run simulation API for Admin console.
 * Calculates pressure level, matches policy, and computes simulated fare without saving any booking or ledger records.
 */
export async function simulateDynamicPricing(
  input: DynamicPricingSimulationInput,
  db: Db = prisma,
): Promise<DynamicPricingSimulationResult> {
  const { zoneId, bookingType, baseFareAmount, simulatedSupply, simulatedDemand } = input;
  const now = new Date();

  const ratio = simulatedDemand > 0 ? Number((simulatedSupply / simulatedDemand).toFixed(2)) : 10.0;
  const pressure = calculatePressureFromSignals({
    supplyDemandRatio: ratio,
    healthScore: ratio < 0.5 ? 35 : ratio < 0.8 ? 60 : 90,
    demandTrendPercent: 0,
    expectedEligibleSupply: simulatedSupply,
    forecastedDemand: simulatedDemand,
  });

  const matchedPolicy = await findActivePricingPolicy(bookingType, zoneId, now, db);
  const evaluation = calculatePolicyAdjustment(baseFareAmount, pressure.pressureLevel, matchedPolicy);

  return {
    pressureLevel: pressure.pressureLevel,
    supplyDemandRatio: ratio,
    matchedPolicy,
    calculatedAdjustmentAmount: evaluation.dynamicAdjustmentAmount,
    finalSimulatedFareAmount: evaluation.finalGrossFareAmount,
    wasCapped: evaluation.wasCapped,
  };
}
