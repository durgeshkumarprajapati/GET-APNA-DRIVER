import { BookingType } from '@prisma/client';
import { calculateFareBreakdown } from '@/modules/pricing/domain/pricing-rules';
import type { PricingRulesConfig } from '@/modules/pricing/domain/pricing-types';

describe('Phase 56 Pricing Rules Unit Tests', () => {
  const mockConfig: PricingRulesConfig = {
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

  it('calculates POINT_TO_POINT fare without dropoff (min fare applies)', () => {
    const breakdown = calculateFareBreakdown({
      bookingType: BookingType.POINT_TO_POINT,
      estimatedDistanceKm: 0,
      estimatedDurationMinutes: 0,
      config: mockConfig,
    });

    expect(breakdown.baseFareAmount).toBe('100.0000');
    expect(breakdown.distanceFareAmount).toBe('0.0000');
    expect(breakdown.minimumFareAmount).toBe('150.0000');
    expect(breakdown.subtotalAmount).toBe('150.0000');
    expect(breakdown.platformFeeAmount).toBe('25.0000');
    expect(breakdown.totalFareAmount).toBe('175.0000');
  });

  it('calculates HOURLY hire fare correctly for 4 hours', () => {
    const breakdown = calculateFareBreakdown({
      bookingType: BookingType.HOURLY,
      hireDurationMinutes: 240,
      config: mockConfig,
    });

    // 4 hours * 250 = 1000 subtotal + 25 platform fee = 1025
    expect(breakdown.packageAdjustmentAmount).toBe('1000.0000');
    expect(breakdown.subtotalAmount).toBe('1000.0000');
    expect(breakdown.totalFareAmount).toBe('1025.0000');
  });

  it('calculates DAILY hire fare correctly for 2 days', () => {
    const breakdown = calculateFareBreakdown({
      bookingType: BookingType.DAILY,
      hireDurationMinutes: 2880,
      numberOfDays: 2,
      config: mockConfig,
    });

    // 2 days * 1800 = 3600 subtotal + 25 platform fee = 3625
    expect(breakdown.packageAdjustmentAmount).toBe('3600.0000');
    expect(breakdown.subtotalAmount).toBe('3600.0000');
    expect(breakdown.totalFareAmount).toBe('3625.0000');
  });

  it('calculates WEEKLY hire fare correctly for 1 week', () => {
    const breakdown = calculateFareBreakdown({
      bookingType: BookingType.WEEKLY,
      hireDurationMinutes: 10080,
      numberOfWeeks: 1,
      config: mockConfig,
    });

    // 1 week * 10000 = 10000 subtotal + 25 platform fee = 10025
    expect(breakdown.packageAdjustmentAmount).toBe('10000.0000');
    expect(breakdown.subtotalAmount).toBe('10000.0000');
    expect(breakdown.totalFareAmount).toBe('10025.0000');
  });

  it('calculates MONTHLY hire fare correctly for 1 month', () => {
    const breakdown = calculateFareBreakdown({
      bookingType: BookingType.MONTHLY,
      hireDurationMinutes: 43200,
      numberOfMonths: 1,
      config: mockConfig,
    });

    // 1 month * 35000 = 35000 subtotal + 25 platform fee = 35025
    expect(breakdown.packageAdjustmentAmount).toBe('35000.0000');
    expect(breakdown.subtotalAmount).toBe('35000.0000');
    expect(breakdown.totalFareAmount).toBe('35025.0000');
  });
});
