import { getUnifiedGrowthPlatformSummary } from '@/modules/analytics/application/unified-growth-platform-service';

describe('Phase 100 — Unified Customer Growth & Experience Platform', () => {
  it('consolidates customer lifecycle, cohort campaigns, supply-demand balance, and CSAT metrics', async () => {
    const mockDb: any = {
      user: { count: jest.fn().mockResolvedValue(1500) },
      driverProfile: { count: jest.fn().mockResolvedValue(120) },
      booking: { count: jest.fn().mockResolvedValue(45) },
    };

    const summary = await getUnifiedGrowthPlatformSummary(mockDb);

    expect(summary.customerLifecycle.ltvCacRatio).toBeGreaterThan(1.0);
    expect(summary.customerLifecycle.customerHealthGrade).toBe('HEALTHY');
    expect(summary.reactivationCampaigns.length).toBeGreaterThan(0);
    expect(summary.supplyDemandBalance.imbalanceScore).toBeDefined();
    expect(summary.featureAdoption.length).toBe(4);
    expect(summary.overallPlatformScore).toBeGreaterThanOrEqual(90);
  });
});
