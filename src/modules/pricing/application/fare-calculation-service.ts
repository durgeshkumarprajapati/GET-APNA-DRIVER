import 'server-only';
import { BookingType } from '@prisma/client';
import { prisma, type Db } from '@/shared/database/prisma';
import { getString } from '@/shared/config/configuration-service';
import type {
  FareBreakdown,
  LocationCoordinates,
  PricingRulesConfig,
} from '../domain/pricing-types';
import type { DynamicPricingEvaluationResult } from '@/modules/dynamic-pricing/domain/pricing-pressure-types';
import { calculateFareBreakdown } from '../domain/pricing-rules';
import { estimateRoute } from './route-estimation-service';

import { evaluateDynamicPricing } from '@/modules/dynamic-pricing/application/dynamic-pricing-service';

export interface FareCalculationInput {
  bookingType: BookingType;
  pickup: LocationCoordinates;
  dropoff?: LocationCoordinates | null;
  estimatedDurationMinutes?: number | null;
  actualDurationMinutes?: number | null;
  numberOfDays?: number | null;
  numberOfWeeks?: number | null;
  numberOfMonths?: number | null;
  hourlyPackageHours?: number | null;
  hireDurationMinutes?: number | null;
  zoneId?: string | null;
  /**
   * For DAILY/WEEKLY/MONTHLY bookings where the customer selected a
   * specific driver at that driver's own rate — overrides the matching
   * platform-default rate field before the fare breakdown is computed.
   */
  driverCustomRate?: string | null;
}

/**
 * True only when a driver custom rate was supplied AND this booking type
 * actually has a matching rate field to override (DAILY/FULL_DAY/WEEKLY/
 * MONTHLY). Governs both the rate override below and whether Controlled
 * Dynamic Pricing is skipped — an irrelevant/stray driverCustomRate for any
 * other booking type must never suppress normal surge pricing.
 */
function usesDriverCustomRate(bookingType: BookingType, driverCustomRate?: string | null): boolean {
  if (!driverCustomRate) return false;
  return (
    bookingType === BookingType.DAILY ||
    bookingType === BookingType.FULL_DAY ||
    bookingType === BookingType.WEEKLY ||
    bookingType === BookingType.MONTHLY
  );
}

/**
 * Overrides the platform-default rate for the matching booking-type field
 * with the driver's own rate, so calculateFareBreakdown prices the hire at
 * exactly what the customer agreed to — never the platform default.
 */
function applyDriverCustomRate(
  rates: PricingRulesConfig,
  bookingType: BookingType,
  driverCustomRate?: string | null,
): PricingRulesConfig {
  if (!usesDriverCustomRate(bookingType, driverCustomRate)) return rates;
  switch (bookingType) {
    case BookingType.DAILY:
    case BookingType.FULL_DAY:
      return { ...rates, dailyRate: driverCustomRate as string };
    case BookingType.WEEKLY:
      return { ...rates, weeklyRate: driverCustomRate as string };
    case BookingType.MONTHLY:
      return { ...rates, monthlyRate: driverCustomRate as string };
    default:
      return rates;
  }
}

/**
 * A driver-custom-rate hire is priced exactly at the rate the customer
 * already agreed to — Controlled Dynamic Pricing surge/demand adjustments
 * never apply on top of it.
 */
function noDynamicAdjustment(totalFareAmount: string): DynamicPricingEvaluationResult {
  const baseFareAmount = Number(totalFareAmount);
  return {
    baseFareAmount,
    dynamicAdjustmentAmount: 0,
    finalGrossFareAmount: baseFareAmount,
    appliedPolicyId: null,
    appliedPolicyVersion: null,
    appliedPolicyName: null,
    pressureState: 'NORMAL',
    adjustmentPercentage: 0,
    flatSurgeAmount: 0,
    wasCapped: false,
  };
}

export interface FareCalculationResult {
  estimatedDistanceKm: number;
  estimatedDurationMinutes: number;
  breakdown: FareBreakdown;
  rates: PricingRulesConfig;
  routeProvider: string;
}

/**
 * Fetches active pricing configuration from SystemConfiguration storage.
 */
export async function getActivePricingRules(db: Db = prisma): Promise<PricingRulesConfig> {
  const [
    baseFare,
    perKilometerRate,
    perMinuteRate,
    minimumFare,
    platformFee,
    hourlyRate,
    dailyRate,
    weeklyRate,
    monthlyRate,
  ] = await Promise.all([
    getString('pricing.base_fare', '100.0000', db),
    getString('pricing.per_kilometer_rate', '15.0000', db),
    getString('pricing.per_minute_rate', '2.0000', db),
    getString('pricing.minimum_fare', '150.0000', db),
    getString('pricing.platform_fee', '25.0000', db),
    getString('pricing.hourly_rate', '250.0000', db),
    getString('pricing.daily_rate', '1800.0000', db),
    getString('pricing.weekly_rate', '10000.0000', db),
    getString('pricing.monthly_rate', '35000.0000', db),
  ]);

  return {
    baseFare,
    perKilometerRate,
    perMinuteRate,
    minimumFare,
    platformFee,
    hourlyRate,
    dailyRate,
    weeklyRate,
    monthlyRate,
  };
}

/**
 * Estimates route distance/duration and calculates estimated fare snapshot.
 */
export async function calculateEstimatedFare(
  input: FareCalculationInput,
  db: Db = prisma,
): Promise<FareCalculationResult> {
  const rates = applyDriverCustomRate(
    await getActivePricingRules(db),
    input.bookingType,
    input.driverCustomRate,
  );
  const route = await estimateRoute({
    pickup: input.pickup,
    dropoff: input.dropoff,
    bookingType: input.bookingType,
  });

  const durationMinutes = input.estimatedDurationMinutes ?? route.durationMinutes;

  const rawBreakdown = calculateFareBreakdown({
    bookingType: input.bookingType,
    estimatedDistanceKm: route.distanceKm,
    estimatedDurationMinutes: durationMinutes,
    numberOfDays: input.numberOfDays,
    numberOfWeeks: input.numberOfWeeks,
    numberOfMonths: input.numberOfMonths,
    hourlyPackageHours: input.hourlyPackageHours,
    hireDurationMinutes: input.hireDurationMinutes,
    config: rates,
  });

  // Evaluate Controlled Dynamic Pricing adjustment — skipped entirely when a
  // driver custom rate applies, since that rate is exactly what the
  // customer agreed to pay.
  const dynamicResult = usesDriverCustomRate(input.bookingType, input.driverCustomRate)
    ? noDynamicAdjustment(rawBreakdown.totalFareAmount)
    : await evaluateDynamicPricing(
        {
          baseFareAmount: Number(rawBreakdown.totalFareAmount),
          bookingType: input.bookingType,
          zoneId: input.zoneId,
        },
        db,
      );

  const breakdown: FareBreakdown = {
    ...rawBreakdown,
    dynamicAdjustmentAmount: dynamicResult.dynamicAdjustmentAmount.toFixed(4),
    dynamicPricingPolicyId: dynamicResult.appliedPolicyId,
    dynamicPricingPolicyVersion: dynamicResult.appliedPolicyVersion,
    pressureState: dynamicResult.pressureState,
    totalFareAmount: dynamicResult.finalGrossFareAmount.toFixed(4),
  };

  return {
    estimatedDistanceKm: route.distanceKm,
    estimatedDurationMinutes: durationMinutes,
    breakdown,
    rates,
    routeProvider: route.provider,
  };
}

/**
 * Calculates final trip fare using actual trip duration and initial route distance snapshot.
 */
export async function calculateFinalFare(
  input: FareCalculationInput,
  db: Db = prisma,
): Promise<FareCalculationResult> {
  const rates = applyDriverCustomRate(
    await getActivePricingRules(db),
    input.bookingType,
    input.driverCustomRate,
  );
  const route = await estimateRoute({
    pickup: input.pickup,
    dropoff: input.dropoff,
    bookingType: input.bookingType,
  });

  const finalDurationMinutes =
    input.actualDurationMinutes ?? input.estimatedDurationMinutes ?? route.durationMinutes;

  const rawBreakdown = calculateFareBreakdown({
    bookingType: input.bookingType,
    estimatedDistanceKm: route.distanceKm,
    actualDurationMinutes: finalDurationMinutes,
    numberOfDays: input.numberOfDays,
    numberOfWeeks: input.numberOfWeeks,
    numberOfMonths: input.numberOfMonths,
    hourlyPackageHours: input.hourlyPackageHours,
    hireDurationMinutes: input.hireDurationMinutes,
    config: rates,
  });

  // Evaluate Controlled Dynamic Pricing adjustment — skipped entirely when a
  // driver custom rate applies, since that rate is exactly what the
  // customer agreed to pay.
  const dynamicResult = usesDriverCustomRate(input.bookingType, input.driverCustomRate)
    ? noDynamicAdjustment(rawBreakdown.totalFareAmount)
    : await evaluateDynamicPricing(
        {
          baseFareAmount: Number(rawBreakdown.totalFareAmount),
          bookingType: input.bookingType,
          zoneId: input.zoneId,
        },
        db,
      );

  const breakdown: FareBreakdown = {
    ...rawBreakdown,
    dynamicAdjustmentAmount: dynamicResult.dynamicAdjustmentAmount.toFixed(4),
    dynamicPricingPolicyId: dynamicResult.appliedPolicyId,
    dynamicPricingPolicyVersion: dynamicResult.appliedPolicyVersion,
    pressureState: dynamicResult.pressureState,
    totalFareAmount: dynamicResult.finalGrossFareAmount.toFixed(4),
  };

  return {
    estimatedDistanceKm: route.distanceKm,
    estimatedDurationMinutes: finalDurationMinutes,
    breakdown,
    rates,
    routeProvider: route.provider,
  };
}
