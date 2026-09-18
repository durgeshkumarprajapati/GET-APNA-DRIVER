import {
  calculatePressureFromSignals,
  calculatePolicyAdjustment,
} from '@/modules/dynamic-pricing/domain/pricing-pressure-policy';
import type { DynamicPricingPolicyDTO } from '@/modules/dynamic-pricing/domain/pricing-pressure-types';

describe('Controlled Dynamic Pricing Engine', () => {
  it('calculates CRITICAL pressure when supply/demand ratio is low (<= 0.4)', () => {
    const res = calculatePressureFromSignals({
      supplyDemandRatio: 0.3,
      healthScore: 40,
    });

    expect(res.pressureLevel).toBe('CRITICAL');
  });

  it('calculates NORMAL pressure when supply exceeds demand (ratio > 1.2)', () => {
    const res = calculatePressureFromSignals({
      supplyDemandRatio: 1.5,
      healthScore: 90,
    });

    expect(res.pressureLevel).toBe('NORMAL');
  });

  it('calculates policy adjustment correctly for active policy matching pressure level', () => {
    const mockPolicy: DynamicPricingPolicyDTO = {
      id: 'pol-1',
      name: 'High Demand Surge',
      description: null,
      version: 1,
      status: 'ACTIVE',
      bookingType: null,
      zoneId: null,
      minimumPressure: 'ELEVATED',
      maximumPressure: 'CRITICAL',
      adjustmentPercentage: 20.0,
      maxAdjustmentPercentage: 50.0,
      flatSurgeAmount: 0,
      effectiveFrom: null,
      effectiveUntil: null,
    };

    // Base fare = 500, +20% adjustment = 100 -> final 600
    const result = calculatePolicyAdjustment(500, 'HIGH', mockPolicy);

    expect(result.dynamicAdjustmentAmount).toBe(100);
    expect(result.finalGrossFareAmount).toBe(600);
    expect(result.wasCapped).toBe(false);
  });

  it('enforces hard maxAdjustmentPercentage cap when calculated surge exceeds maximum allowed', () => {
    const mockPolicy: DynamicPricingPolicyDTO = {
      id: 'pol-2',
      name: 'Extreme Surge Cap Policy',
      description: null,
      version: 1,
      status: 'ACTIVE',
      bookingType: null,
      zoneId: null,
      minimumPressure: 'NORMAL',
      maximumPressure: 'CRITICAL',
      adjustmentPercentage: 80.0, // Tries +80%
      maxAdjustmentPercentage: 25.0, // Hard cap at +25%
      flatSurgeAmount: 50,
      effectiveFrom: null,
      effectiveUntil: null,
    };

    // Base fare = 1000, max allowed = +25% (250). Raw = 800+50 = 850 -> Capped to 250!
    const result = calculatePolicyAdjustment(1000, 'CRITICAL', mockPolicy);

    expect(result.dynamicAdjustmentAmount).toBe(250);
    expect(result.finalGrossFareAmount).toBe(1250);
    expect(result.wasCapped).toBe(true);
  });
});
