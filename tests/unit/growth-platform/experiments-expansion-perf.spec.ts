import { trackAndGetGrowthExperimentReport } from '@/modules/analytics/application/services/growth-experimentation-service';
import { getMarketplaceExpansionReport } from '@/modules/location/application/services/marketplace-expansion-service';
import { getPerformanceBudgetReport } from '@/modules/observability/application/services/performance-budget-service';

describe('Phases 110, 111 & 112 — Growth Experiments, Marketplace Expansion & Performance Budgets', () => {
  it('Phase 110: tracks full growth experiment funnel through completed services and repeat bookings', async () => {
    const report = await trackAndGetGrowthExperimentReport();
    expect(report.funnelBreakdown.length).toBe(6);
    expect(report.funnelBreakdown[0].step).toBe('EXPOSURE');
    expect(report.funnelBreakdown[4].step).toBe('SERVICE_COMPLETED');
    expect(report.funnelBreakdown[5].step).toBe('REPEAT_BOOKING');
  });

  it('Phase 111: evaluates geographic expansion candidates with demand/supply heatmaps', async () => {
    const report = await getMarketplaceExpansionReport();
    expect(report.citiesEvaluated.length).toBeGreaterThan(0);
    expect(report.topExpansionCandidate.cityName).toBe('Vadodara');
    expect(report.topExpansionCandidate.opportunityRating).toBe('VERY_HIGH');
  });

  it('Phase 112: verifies latency performance budgets for dashboard, booking validation, and realtime updates', async () => {
    const report = await getPerformanceBudgetReport();
    expect(report.overallStatus).toBe('OPTIMAL');
    expect(report.budgets.every((b) => b.isWithinBudget)).toBe(true);
  });
});
