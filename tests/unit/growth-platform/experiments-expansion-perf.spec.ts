import type { Db } from '@/shared/database/prisma';
import { trackAndGetGrowthExperimentReport } from '@/modules/analytics/application/services/growth-experimentation-service';
import { getMarketplaceExpansionReport } from '@/modules/location/application/services/marketplace-expansion-service';
import { getPerformanceBudgetReport } from '@/modules/observability/application/services/performance-budget-service';

type MockDb = Partial<Db> & Record<string, unknown>;

describe('Phases 110, 111 & 112 — Growth Experiments, Marketplace Expansion & Performance Budgets', () => {
  describe('Phase 110 — Growth Experimentation', () => {
    it('reports real booking-lifecycle counts and honestly zeroes untracked pre-booking funnel steps', async () => {
      const mockDb: MockDb = {
        booking: {
          count: jest
            .fn()
            .mockResolvedValueOnce(100) // BOOKING_STARTED
            .mockResolvedValueOnce(80), // BOOKING_COMPLETED
          groupBy: jest.fn().mockResolvedValue([{ customerId: 'c1' }, { customerId: 'c2' }]),
        } as unknown as Db['booking'],
      };

      const report = await trackAndGetGrowthExperimentReport('exp_test', mockDb as Db);

      expect(report.funnelBreakdown.length).toBe(6);
      const byStep = Object.fromEntries(report.funnelBreakdown.map((f) => [f.step, f]));
      expect(byStep.EXPOSURE.count).toBe(0);
      expect(byStep.INTERACTION.count).toBe(0);
      expect(byStep.BOOKING_STARTED.count).toBe(100);
      expect(byStep.BOOKING_COMPLETED.count).toBe(80);
      expect(byStep.REPEAT_BOOKING.count).toBe(2);
      // No real per-variant assignment tracking — never claims a specific
      // winning variant or a specific exposure count.
      expect(report.winningVariant).toBeUndefined();
      expect(report.totalExposures).toBe(0);
    });
  });

  describe('Phase 111 — Marketplace Expansion', () => {
    it('evaluates real configured zones by real demand/supply counts, never invented cities', async () => {
      const mockDb: MockDb = {
        marketplaceZone: {
          findMany: jest.fn().mockResolvedValue([
            {
              id: 'zone-1',
              name: 'Delhi Central',
              code: 'DELHI_CENTRAL',
              centerLatitude: 28.6139,
              centerLongitude: 77.209,
              radiusMeters: 5000,
            },
          ]),
        } as unknown as Db['marketplaceZone'],
        driverProfile: {
          findMany: jest
            .fn()
            .mockResolvedValue([{ currentLocation: { latitude: 28.615, longitude: 77.21 } }]),
        } as unknown as Db['driverProfile'],
        booking: {
          findMany: jest
            .fn()
            .mockResolvedValueOnce(
              Array.from({ length: 25 }, () => ({
                pickupLatitude: 28.614,
                pickupLongitude: 77.208,
              })),
            )
            .mockResolvedValueOnce([
              { pickupLatitude: 28.614, pickupLongitude: 77.208, status: 'TRIP_COMPLETED' },
              { pickupLatitude: 28.614, pickupLongitude: 77.208, status: 'CANCELLED' },
            ]),
        } as unknown as Db['booking'],
      };

      const report = await getMarketplaceExpansionReport(mockDb as Db);

      expect(report.citiesEvaluated.length).toBe(1);
      expect(report.citiesEvaluated[0].cityName).toBe('Delhi Central');
      expect(report.citiesEvaluated[0].demandLevel).toBe('HIGH');
      expect(report.citiesEvaluated[0].driverSupplyLevel).toBe('LOW');
      expect(report.topExpansionCandidate?.cityName).toBe('Delhi Central');
    });

    it('returns an empty, honest report when no zones are configured instead of fabricated cities', async () => {
      const mockDb: MockDb = {
        marketplaceZone: {
          findMany: jest.fn().mockResolvedValue([]),
        } as unknown as Db['marketplaceZone'],
      };

      const report = await getMarketplaceExpansionReport(mockDb as Db);

      expect(report.citiesEvaluated).toEqual([]);
      expect(report.topExpansionCandidate).toBeUndefined();
    });
  });

  describe('Phase 112 — Performance Budgets', () => {
    it('reports latency as honestly not measured rather than fabricated passing numbers', async () => {
      const report = await getPerformanceBudgetReport();

      expect(report.overallStatus).toBe('NOT_MEASURED');
      expect(report.budgets.every((b) => b.statusGrade === 'NOT_MEASURED')).toBe(true);
      expect(report.budgets.every((b) => b.actualLatencyMs === null)).toBe(true);
      expect(report.realtimeUpdateLatencyMs).toBeNull();
    });
  });
});
