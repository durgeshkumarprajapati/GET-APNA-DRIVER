import 'server-only';
import type { BookingType } from '@prisma/client';
import { prisma, type Db } from '@/shared/database/prisma';
import { getString } from '@/shared/config/configuration-service';
import type {
  FareBreakdown,
  LocationCoordinates,
  PricingRulesConfig,
} from '../domain/pricing-types';
import { calculateFareBreakdown } from '../domain/pricing-rules';
import { estimateRoute } from './route-estimation-service';

export interface FareCalculationInput {
  bookingType: BookingType;
  pickup: LocationCoordinates;
  dropoff?: LocationCoordinates | null;
  estimatedDurationMinutes?: number | null;
  actualDurationMinutes?: number | null;
  numberOfDays?: number | null;
  hourlyPackageHours?: number | null;
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
  ] = await Promise.all([
    getString('pricing.base_fare', '100.0000', db),
    getString('pricing.per_kilometer_rate', '15.0000', db),
    getString('pricing.per_minute_rate', '2.0000', db),
    getString('pricing.minimum_fare', '150.0000', db),
    getString('pricing.platform_fee', '25.0000', db),
    getString('pricing.hourly_rate', '250.0000', db),
    getString('pricing.daily_rate', '1800.0000', db),
  ]);

  return {
    baseFare,
    perKilometerRate,
    perMinuteRate,
    minimumFare,
    platformFee,
    hourlyRate,
    dailyRate,
  };
}

/**
 * Estimates route distance/duration and calculates estimated fare snapshot.
 */
export async function calculateEstimatedFare(
  input: FareCalculationInput,
  db: Db = prisma,
): Promise<FareCalculationResult> {
  const rates = await getActivePricingRules(db);
  const route = await estimateRoute({
    pickup: input.pickup,
    dropoff: input.dropoff,
    bookingType: input.bookingType,
  });

  const durationMinutes = input.estimatedDurationMinutes ?? route.durationMinutes;

  const breakdown = calculateFareBreakdown({
    bookingType: input.bookingType,
    estimatedDistanceKm: route.distanceKm,
    estimatedDurationMinutes: durationMinutes,
    numberOfDays: input.numberOfDays,
    hourlyPackageHours: input.hourlyPackageHours,
    config: rates,
  });

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
  const rates = await getActivePricingRules(db);
  const route = await estimateRoute({
    pickup: input.pickup,
    dropoff: input.dropoff,
    bookingType: input.bookingType,
  });

  const finalDurationMinutes =
    input.actualDurationMinutes ?? input.estimatedDurationMinutes ?? route.durationMinutes;

  const breakdown = calculateFareBreakdown({
    bookingType: input.bookingType,
    estimatedDistanceKm: route.distanceKm,
    actualDurationMinutes: finalDurationMinutes,
    numberOfDays: input.numberOfDays,
    hourlyPackageHours: input.hourlyPackageHours,
    config: rates,
  });

  return {
    estimatedDistanceKm: route.distanceKm,
    estimatedDurationMinutes: finalDurationMinutes,
    breakdown,
    rates,
    routeProvider: route.provider,
  };
}
