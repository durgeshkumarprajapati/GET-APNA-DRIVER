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
  };

  it('calculates standard ONE_WAY fare correctly', () => {
    // 10 km distance, 30 min duration
    // Base: 100
    // Distance: 10 * 15 = 150
    // Duration: 30 * 2 = 60
    // Subtotal: 100 + 150 + 60 = 310 (>= minimum 150)
    // Total (incl 25 platform fee): 335
    const breakdown = calculateFareBreakdown({
      bookingType: BookingType.ONE_WAY,
      estimatedDistanceKm: 10,
      estimatedDurationMinutes: 30,
      config: defaultRules,
    });

    expect(breakdown.baseFareAmount).toBe('100.0000');
    expect(breakdown.distanceFareAmount).toBe('150.0000');
    expect(breakdown.durationFareAmount).toBe('60.0000');
    expect(breakdown.subtotalAmount).toBe('310.0000');
    expect(breakdown.platformFeeAmount).toBe('25.0000');
    expect(breakdown.totalFareAmount).toBe('335.0000');
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
});
