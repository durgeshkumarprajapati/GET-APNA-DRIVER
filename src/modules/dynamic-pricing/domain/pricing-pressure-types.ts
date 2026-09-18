import { BookingType, DynamicPricingPolicyStatus } from '@prisma/client';

export type PricingPressureLevel = 'NORMAL' | 'ELEVATED' | 'HIGH' | 'CRITICAL';

export interface PressureEvaluationResult {
  pressureLevel: PricingPressureLevel;
  supplyDemandRatio: number;
  healthScore: number;
  demandTrendPercent: number;
  expectedEligibleSupply: number;
  forecastedDemand: number;
  reason: string;
}

export interface DynamicPricingPolicyDTO {
  id: string;
  name: string;
  description: string | null;
  version: number;
  status: DynamicPricingPolicyStatus;
  bookingType: BookingType | null;
  zoneId: string | null;
  minimumPressure: PricingPressureLevel;
  maximumPressure: PricingPressureLevel;
  adjustmentPercentage: number;
  maxAdjustmentPercentage: number;
  flatSurgeAmount: number;
  effectiveFrom: Date | null;
  effectiveUntil: Date | null;
}

export interface DynamicPricingEvaluationInput {
  baseFareAmount: number;
  bookingType: BookingType;
  zoneId?: string | null;
  effectiveTime?: Date;
}

export interface DynamicPricingEvaluationResult {
  baseFareAmount: number;
  dynamicAdjustmentAmount: number;
  finalGrossFareAmount: number;
  appliedPolicyId: string | null;
  appliedPolicyVersion: number | null;
  appliedPolicyName: string | null;
  pressureState: PricingPressureLevel;
  adjustmentPercentage: number;
  flatSurgeAmount: number;
  wasCapped: boolean;
  capReason?: string;
}

export interface DynamicPricingSimulationInput {
  zoneId?: string;
  bookingType: BookingType;
  baseFareAmount: number;
  simulatedSupply: number;
  simulatedDemand: number;
}

export interface DynamicPricingSimulationResult {
  pressureLevel: PricingPressureLevel;
  supplyDemandRatio: number;
  matchedPolicy: DynamicPricingPolicyDTO | null;
  calculatedAdjustmentAmount: number;
  finalSimulatedFareAmount: number;
  wasCapped: boolean;
}
