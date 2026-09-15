import { evaluateMarketplaceHealth } from '@/modules/marketplace-intelligence/domain/marketplace-health-service';

describe('Marketplace Health Evaluator Tests', () => {
  it('should return HEALTHY state when supply ratio is high and cancellation is low', () => {
    const result = evaluateMarketplaceHealth({
      totalRequests: 50,
      completedRides: 48,
      cancelledRides: 2,
      dispatchEligibleSupply: 60,
    });

    expect(result.healthState).toBe('HEALTHY');
    expect(result.healthScore).toBeGreaterThanOrEqual(85);
    expect(result.metrics.cancellationRate).toBe(4.0);
  });

  it('should return WATCH state when cancellation rate is slightly elevated', () => {
    const result = evaluateMarketplaceHealth({
      totalRequests: 100,
      completedRides: 88,
      cancelledRides: 12, // 12% cancellation
      dispatchEligibleSupply: 110,
    });

    expect(result.healthState).toBe('WATCH');
  });

  it('should return STRAINED state when cancellation rate exceeds 15%', () => {
    const result = evaluateMarketplaceHealth({
      totalRequests: 100,
      completedRides: 80,
      cancelledRides: 20, // 20% cancellation
      dispatchEligibleSupply: 90,
    });

    expect(result.healthState).toBe('STRAINED');
  });

  it('should return CRITICAL state when cancellation exceeds 25% or supply ratio is under 0.5', () => {
    const result = evaluateMarketplaceHealth({
      totalRequests: 100,
      completedRides: 65,
      cancelledRides: 30, // 30% cancellation
      dispatchEligibleSupply: 30, // 0.3 ratio
    });

    expect(result.healthState).toBe('CRITICAL');
    expect(result.explanation).toContain('CRITICAL MARKETPLACE ALERT');
  });

  it('should return INSUFFICIENT_DATA when total requests are 0', () => {
    const result = evaluateMarketplaceHealth({
      totalRequests: 0,
      completedRides: 0,
      cancelledRides: 0,
      dispatchEligibleSupply: 10,
    });

    expect(result.healthState).toBe('INSUFFICIENT_DATA');
  });
});
