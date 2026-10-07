import type { Db } from '@/shared/database/prisma';
import { getUnifiedGrowthPlatformSummary } from '@/modules/analytics/application/unified-growth-platform-service';

type MockDb = Partial<Db> & Record<string, unknown>;

describe('Phase 100 — Unified Customer Growth & Experience Platform', () => {
  it('consolidates customer lifecycle, cohort campaigns, supply-demand balance, and CSAT metrics', async () => {
    const mockDb: MockDb = {
      user: { count: jest.fn().mockResolvedValue(1500) } as unknown as Db['user'],
      driverProfile: { count: jest.fn().mockResolvedValue(120) } as unknown as Db['driverProfile'],
      booking: { count: jest.fn().mockResolvedValue(45) } as unknown as Db['booking'],
    };

    const summary = await getUnifiedGrowthPlatformSummary(mockDb as Db);

    expect(summary.customerLifecycle.ltvCacRatio).toBeGreaterThan(1.0);
    expect(summary.customerLifecycle.customerHealthGrade).toBe('HEALTHY');
    expect(summary.reactivationCampaigns.length).toBeGreaterThan(0);
    expect(summary.supplyDemandBalance.imbalanceScore).toBeDefined();
    expect(summary.featureAdoption.length).toBe(4);
    expect(summary.overallPlatformScore).toBeGreaterThanOrEqual(90);
  });
});
