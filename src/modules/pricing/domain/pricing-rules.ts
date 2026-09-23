import { BookingType } from '@prisma/client';
import { roundMoney, toDecimal } from '@/modules/finance/domain/money';
import type { FareBreakdown, PricingCalculationInput } from './pricing-types';

/**
 * Pure domain function computing exact fare breakdown using Decimal precision.
 *
 * GET Apna Driver sells a DRIVER SERVICE, not transportation — the customer
 * already owns the vehicle the driver operates. The customer therefore pays
 * for the driver's time/service (base fare + duration, or a package rate),
 * never for how far the driver's own journey happened to cover. Distance is
 * still estimated elsewhere (route-estimation-service.ts) for ETA, driver
 * discovery and matching — it simply never becomes a fare component here,
 * for any booking type. `distanceFareAmount` stays in FareBreakdown (always
 * zero) rather than being removed, since removing the field would be a
 * breaking API/UI change for no benefit — every consumer already renders
 * it like any other line item.
 */
export function calculateFareBreakdown(input: PricingCalculationInput): FareBreakdown {
  const { bookingType, config } = input;

  const baseFare = toDecimal(config.baseFare);
  const perMinRate = toDecimal(config.perMinuteRate);
  const minFare = toDecimal(config.minimumFare);
  const platformFee = toDecimal(config.platformFee);
  const hourlyRate = toDecimal(config.hourlyRate);
  const dailyRate = toDecimal(config.dailyRate);
  const weeklyRate = toDecimal(config.weeklyRate);
  const monthlyRate = toDecimal(config.monthlyRate);

  const durationMins = toDecimal(
    input.actualDurationMinutes ?? input.estimatedDurationMinutes ?? 0,
  );

  let calculatedBase = baseFare;
  const distanceFare = toDecimal(0);
  let durationFare = perMinRate.mul(durationMins);
  let packageAdjustment = toDecimal(0);

  switch (bookingType) {
    case BookingType.HOURLY: {
      const mins = input.hireDurationMinutes ?? durationMins.toNumber();
      const calculatedHours = Math.ceil((mins || 120) / 60);
      const hours = Math.max(1, input.hourlyPackageHours ?? calculatedHours);
      packageAdjustment = hourlyRate.mul(hours);
      calculatedBase = toDecimal(0); // Package replaces base fare
      durationFare = toDecimal(0); // Package includes duration
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
      break;
    }

    case BookingType.WEEKLY: {
      const mins = input.hireDurationMinutes ?? durationMins.toNumber();
      const calculatedWeeks = Math.ceil((mins || 10080) / 10080);
      const weeks = Math.max(1, input.numberOfWeeks ?? calculatedWeeks);
      packageAdjustment = weeklyRate.mul(weeks);
      calculatedBase = toDecimal(0);
      durationFare = toDecimal(0);
      break;
    }

    case BookingType.MONTHLY: {
      const mins = input.hireDurationMinutes ?? durationMins.toNumber();
      const calculatedMonths = Math.ceil((mins || 43200) / 43200);
      const months = Math.max(1, input.numberOfMonths ?? calculatedMonths);
      packageAdjustment = monthlyRate.mul(months);
      calculatedBase = toDecimal(0);
      durationFare = toDecimal(0);
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
