import { BookingType } from '@prisma/client';

jest.mock('@/shared/config/configuration-service', () => ({
  getString: jest.fn().mockImplementation((key: string, defaultVal: string) => {
    const values: Record<string, string> = {
      'pricing.base_fare': '100.0000',
      'pricing.per_kilometer_rate': '15.0000',
      'pricing.per_minute_rate': '2.0000',
      'pricing.minimum_fare': '150.0000',
      'pricing.platform_fee': '25.0000',
      'pricing.hourly_rate': '250.0000',
      'pricing.daily_rate': '1800.0000',
      'pricing.weekly_rate': '10000.0000',
      'pricing.monthly_rate': '35000.0000',
    };
    return Promise.resolve(values[key] ?? defaultVal);
  }),
}));

jest.mock('@/modules/pricing/application/route-estimation-service', () => ({
  estimateRoute: jest.fn().mockResolvedValue({
    distanceKm: 0,
    durationMinutes: 0,
    provider: 'test',
  }),
}));

jest.mock('@/modules/dynamic-pricing/application/dynamic-pricing-service', () => ({
  evaluateDynamicPricing: jest.fn(),
}));

import { calculateEstimatedFare } from '@/modules/pricing/application/fare-calculation-service';
import { evaluateDynamicPricing } from '@/modules/dynamic-pricing/application/dynamic-pricing-service';

const mockEvaluateDynamicPricing = evaluateDynamicPricing as jest.Mock;

describe('FareCalculationService - driver custom rate (DAILY/WEEKLY/MONTHLY)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockEvaluateDynamicPricing.mockResolvedValue({
      baseFareAmount: 0,
      dynamicAdjustmentAmount: 500,
      finalGrossFareAmount: 99999,
      appliedPolicyId: 'policy-1',
      appliedPolicyVersion: 2,
      appliedPolicyName: 'Surge Policy',
      pressureState: 'HIGH',
      adjustmentPercentage: 10,
      flatSurgeAmount: 0,
      wasCapped: false,
    });
  });

  it("prices a WEEKLY hire at the driver's own rate instead of the platform default", async () => {
    const result = await calculateEstimatedFare({
      bookingType: BookingType.WEEKLY,
      pickup: { latitude: 28.6139, longitude: 77.209, address: 'A' },
      numberOfWeeks: 1,
      hireDurationMinutes: 10080,
      driverCustomRate: '20000.0000',
    });

    expect(result.breakdown.packageAdjustmentAmount).toBe('20000.0000');
    // Platform-default weekly rate (10000) was NOT used.
    expect(result.breakdown.packageAdjustmentAmount).not.toBe('10000.0000');
  });

  it('skips Controlled Dynamic Pricing entirely when a driver custom rate applies', async () => {
    const result = await calculateEstimatedFare({
      bookingType: BookingType.WEEKLY,
      pickup: { latitude: 28.6139, longitude: 77.209, address: 'A' },
      numberOfWeeks: 1,
      hireDurationMinutes: 10080,
      driverCustomRate: '20000.0000',
    });

    expect(mockEvaluateDynamicPricing).not.toHaveBeenCalled();
    // Total is exactly package (20000) + platform fee (25) — no surge added.
    expect(result.breakdown.totalFareAmount).toBe('20025.0000');
    expect(result.breakdown.dynamicAdjustmentAmount).toBe('0.0000');
    expect(result.breakdown.pressureState).toBe('NORMAL');
  });

  it('still applies Controlled Dynamic Pricing normally when no driver custom rate is given', async () => {
    const result = await calculateEstimatedFare({
      bookingType: BookingType.WEEKLY,
      pickup: { latitude: 28.6139, longitude: 77.209, address: 'A' },
      numberOfWeeks: 1,
      hireDurationMinutes: 10080,
    });

    expect(mockEvaluateDynamicPricing).toHaveBeenCalled();
    expect(result.breakdown.totalFareAmount).toBe('99999.0000');
    expect(result.breakdown.pressureState).toBe('HIGH');
  });

  it('leaves other booking types unaffected by an (irrelevant) driverCustomRate', async () => {
    const result = await calculateEstimatedFare({
      bookingType: BookingType.ONE_WAY,
      pickup: { latitude: 28.6139, longitude: 77.209, address: 'A' },
      estimatedDurationMinutes: 0,
      driverCustomRate: '20000.0000',
    });

    // ONE_WAY has no rate field driverCustomRate could override, so the
    // regular dynamic-pricing evaluation still runs.
    expect(mockEvaluateDynamicPricing).toHaveBeenCalled();
    expect(result.breakdown.totalFareAmount).toBe('99999.0000');
  });
});
