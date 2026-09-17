import { BookingType } from '@prisma/client';
import { roundMoney, toDecimal } from '@/modules/finance/domain/money';
import type { FareBreakdown, PricingCalculationInput } from './pricing-types';

/**
 * Pure domain function computing exact fare breakdown using Decimal precision.
 */
export function calculateFareBreakdown(input: PricingCalculationInput): FareBreakdown {
  const { bookingType, config } = input;

  const baseFare = toDecimal(config.baseFare);
  const perKmRate = toDecimal(config.perKilometerRate);
  const perMinRate = toDecimal(config.perMinuteRate);
  const minFare = toDecimal(config.minimumFare);
  const platformFee = toDecimal(config.platformFee);
  const hourlyRate = toDecimal(config.hourlyRate);
  const dailyRate = toDecimal(config.dailyRate);
  const weeklyRate = toDecimal(config.weeklyRate);
  const monthlyRate = toDecimal(config.monthlyRate);

  const distanceKm = toDecimal(input.estimatedDistanceKm ?? 0);
  const durationMins = toDecimal(
    input.actualDurationMinutes ?? input.estimatedDurationMinutes ?? 0,
  );

  let calculatedBase = baseFare;
  let distanceFare = perKmRate.mul(distanceKm);
  let durationFare = perMinRate.mul(durationMins);
  let packageAdjustment = toDecimal(0);

  switch (bookingType) {
    case BookingType.ROUND_TRIP: {
      // Round trip distance is doubled (outbound + return)
      distanceFare = distanceFare.mul(1.8); // 10% round trip discount on return leg distance
      break;
    }

    case BookingType.HOURLY: {
      const mins = input.hireDurationMinutes ?? durationMins.toNumber();
      const calculatedHours = Math.ceil((mins || 120) / 60);
      const hours = Math.max(1, input.hourlyPackageHours ?? calculatedHours);
      packageAdjustment = hourlyRate.mul(hours);
      calculatedBase = toDecimal(0); // Package replaces base fare
      durationFare = toDecimal(0); // Package includes duration
      distanceFare = toDecimal(0); // Driver hire includes base distance
      break;
    }

    case BookingType.DAILY:
    case BookingType.FULL_DAY: {
      const mins = input.hireDurationMinutes ?? durationMins.toNumber();
      const calculatedDays = Math.ceil((mins || 1440) / 1440);
      const days = Math.max(1, input.numberOfDays ?? calculatedDays);
      packageAdjustment = dailyRate.mul(days);
      calculatedBase = toDecimal(0);
      durationFare = toDecimal(0);
      distanceFare = toDecimal(0);
      break;
    }

    case BookingType.WEEKLY: {
      const mins = input.hireDurationMinutes ?? durationMins.toNumber();
      const calculatedWeeks = Math.ceil((mins || 10080) / 10080);
      const weeks = Math.max(1, input.numberOfWeeks ?? calculatedWeeks);
      packageAdjustment = weeklyRate.mul(weeks);
      calculatedBase = toDecimal(0);
      durationFare = toDecimal(0);
      distanceFare = toDecimal(0);
      break;
    }

    case BookingType.MONTHLY: {
      const mins = input.hireDurationMinutes ?? durationMins.toNumber();
      const calculatedMonths = Math.ceil((mins || 43200) / 43200);
      const months = Math.max(1, input.numberOfMonths ?? calculatedMonths);
      packageAdjustment = monthlyRate.mul(months);
      calculatedBase = toDecimal(0);
      durationFare = toDecimal(0);
      distanceFare = toDecimal(0);
      break;
    }

    case BookingType.MULTI_DAY: {
      const days = Math.max(1, input.numberOfDays ?? 2);
      packageAdjustment = dailyRate.mul(days);
      calculatedBase = toDecimal(0);
      durationFare = toDecimal(0);
      break;
    }

    case BookingType.POINT_TO_POINT:
    case BookingType.ONE_WAY:
    default: {
      break;
    }
  }

  // Calculate subtotal before minimum fare check
  let subtotal = calculatedBase.add(distanceFare).add(durationFare).add(packageAdjustment);

  // Apply minimum fare rule
  if (subtotal.lessThan(minFare)) {
    subtotal = minFare;
  }

  // Total includes platform fee
  const total = subtotal.add(platformFee);

  return {
    baseFareAmount: roundMoney(calculatedBase).toFixed(4),
    distanceFareAmount: roundMoney(distanceFare).toFixed(4),
    durationFareAmount: roundMoney(durationFare).toFixed(4),
    packageAdjustmentAmount: roundMoney(packageAdjustment).toFixed(4),
    minimumFareAmount: roundMoney(minFare).toFixed(4),
    platformFeeAmount: roundMoney(platformFee).toFixed(4),
    subtotalAmount: roundMoney(subtotal).toFixed(4),
    totalFareAmount: roundMoney(total).toFixed(4),
  };
}
