import 'server-only';
import type { BookingType, Prisma } from '@prisma/client';
import type { FareCalculationResult } from './fare-calculation-service';
import type { PricingQuoteSnapshot, RouteEstimate } from '../domain/pricing-types';

export function createPricingQuoteSnapshot(
  bookingType: BookingType,
  result: FareCalculationResult,
): PricingQuoteSnapshot {
  return {
    bookingType,
    rates: result.rates,
    route: {
      distanceMeters: Math.round(result.estimatedDistanceKm * 1000),
      distanceKm: result.estimatedDistanceKm,
      durationSeconds: result.estimatedDurationMinutes * 60,
      durationMinutes: result.estimatedDurationMinutes,
      provider: result.routeProvider as RouteEstimate['provider'],
      isEstimate: true,
    },
    breakdown: result.breakdown,
    calculatedAt: new Date().toISOString(),
  };
}

export function toPrismaJson(snapshot: PricingQuoteSnapshot): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(snapshot));
}
