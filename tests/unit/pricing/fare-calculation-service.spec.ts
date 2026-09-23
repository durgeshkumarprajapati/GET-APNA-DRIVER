import { BookingType } from '@prisma/client';
import { calculateFareBreakdown } from '@/modules/pricing/domain/pricing-rules';
import type { PricingRulesConfig } from '@/modules/pricing/domain/pricing-types';

describe('Pricing Module - Fare Calculation Rules', () => {
  const defaultRules: PricingRulesConfig = {
    baseFare: '100.0000',
    perKilometerRate: '15.0000',
    perMinuteRate: '2.0000',
    minimumFare: '150.0000',
    platformFee: '25.0000',
    hourlyRate: '250.0000',
    dailyRate: '1800.0000',
    weeklyRate: '10000.0000',
    monthlyRate: '35000.0000',
  };

  it('calculates standard ONE_WAY fare correctly — driver-service pricing (base + duration), never distance', () => {
    // The customer already owns the vehicle; they pay for the driver's
    // service (base + time), never for how far the driver's own journey
    // covered — distance stays purely an ETA/matching input, at 0 km or
    // 100 km alike.
    // Base: 100
    // Distance: never billed, regardless of the 10km estimate below.
    // Duration: 30 * 2 = 60
    // Subtotal: 100 + 0 + 60 = 160 (>= minimum 150)
    // Total (incl 25 platform fee): 185
    const breakdown = calculateFareBreakdown({
      bookingType: BookingType.ONE_WAY,
      estimatedDistanceKm: 10,
      estimatedDurationMinutes: 30,
      config: defaultRules,
    });

    expect(breakdown.baseFareAmount).toBe('100.0000');
    expect(breakdown.distanceFareAmount).toBe('0.0000');
    expect(breakdown.durationFareAmount).toBe('60.0000');
    expect(breakdown.subtotalAmount).toBe('160.0000');
    expect(breakdown.platformFeeAmount).toBe('25.0000');
    expect(breakdown.totalFareAmount).toBe('185.0000');
  });

  it('never bills distance for ONE_WAY regardless of how far the estimate says the driver travels', () => {
    const short = calculateFareBreakdown({
      bookingType: BookingType.ONE_WAY,
      estimatedDistanceKm: 2,
      estimatedDurationMinutes: 30,
      config: defaultRules,
    });
    const long = calculateFareBreakdown({
      bookingType: BookingType.ONE_WAY,
      estimatedDistanceKm: 200,
      estimatedDurationMinutes: 30,
      config: defaultRules,
    });

    expect(short.distanceFareAmount).toBe('0.0000');
    expect(long.distanceFareAmount).toBe('0.0000');
    expect(short.totalFareAmount).toBe(long.totalFareAmount);
  });

  it('never bills distance for ROUND_TRIP either, and applies no special round-trip multiplier', () => {
    const breakdown = calculateFareBreakdown({
      bookingType: BookingType.ROUND_TRIP,
      estimatedDistanceKm: 20,
      estimatedDurationMinutes: 40,
      config: defaultRules,
    });

    // Base: 100, Distance: 0, Duration: 40 * 2 = 80. Subtotal 180 (>= 150).
    expect(breakdown.distanceFareAmount).toBe('0.0000');
    expect(breakdown.durationFareAmount).toBe('80.0000');
    expect(breakdown.subtotalAmount).toBe('180.0000');
  });

  it('enforces minimum fare rule when calculated fare is below minimum', () => {
    // 1 km distance, 5 min duration
    // Subtotal = 100 + 15 + 10 = 125 < minimum 150
    // Enforced subtotal = 150
    // Total (incl 25 platform fee): 175
    const breakdown = calculateFareBreakdown({
      bookingType: BookingType.ONE_WAY,
      estimatedDistanceKm: 1,
      estimatedDurationMinutes: 5,
      config: defaultRules,
    });

    expect(breakdown.subtotalAmount).toBe('150.0000');
    expect(breakdown.totalFareAmount).toBe('175.0000');
  });

  it('calculates HOURLY package pricing correctly', () => {
    // 4 hours package @ 250/hr = 1000
    // Total (incl 25 platform fee): 1025
    const breakdown = calculateFareBreakdown({
      bookingType: BookingType.HOURLY,
      hourlyPackageHours: 4,
      config: defaultRules,
    });

    expect(breakdown.packageAdjustmentAmount).toBe('1000.0000');
    expect(breakdown.subtotalAmount).toBe('1000.0000');
    expect(breakdown.totalFareAmount).toBe('1025.0000');
  });

  it('calculates FULL_DAY package pricing correctly', () => {
    // 1 day @ 1800/day = 1800
    // Total: 1825
    const breakdown = calculateFareBreakdown({
      bookingType: BookingType.FULL_DAY,
      config: defaultRules,
    });

    expect(breakdown.packageAdjustmentAmount).toBe('1800.0000');
    expect(breakdown.subtotalAmount).toBe('1800.0000');
    expect(breakdown.totalFareAmount).toBe('1825.0000');
  });

  it('calculates MULTI_DAY package pricing correctly', () => {
    // 3 days @ 1800/day = 5400
    // Total: 5425
    const breakdown = calculateFareBreakdown({
      bookingType: BookingType.MULTI_DAY,
      numberOfDays: 3,
      config: defaultRules,
    });

    expect(breakdown.packageAdjustmentAmount).toBe('5400.0000');
    expect(breakdown.subtotalAmount).toBe('5400.0000');
    expect(breakdown.totalFareAmount).toBe('5425.0000');
  });

  it('does not add a stray distance charge on top of the MULTI_DAY package price when a route-estimated distance is present', () => {
    // Regression test: the route provider falls back to a fixed 10km
    // estimate for non-single-leg booking types with no dropoff (e.g. a
    // pickup-only MULTI_DAY hire). MULTI_DAY is package-priced — like
    // HOURLY/DAILY/FULL_DAY/WEEKLY/MONTHLY — so that estimated distance
    // must never be billed on top of the day-rate package.
    // 3 days @ 1800/day = 5400, total 5425 — identical to the no-distance case.
    const breakdown = calculateFareBreakdown({
      bookingType: BookingType.MULTI_DAY,
      numberOfDays: 3,
      estimatedDistanceKm: 10,
      config: defaultRules,
    });

    expect(breakdown.distanceFareAmount).toBe('0.0000');
    expect(breakdown.packageAdjustmentAmount).toBe('5400.0000');
    expect(breakdown.subtotalAmount).toBe('5400.0000');
    expect(breakdown.totalFareAmount).toBe('5425.0000');
  });
});
