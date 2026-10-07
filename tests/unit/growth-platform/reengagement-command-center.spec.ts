import type { Db } from '@/shared/database/prisma';
import { getCustomerReengagementSchedule } from '@/modules/customer/application/services/customer-reengagement-service';
import { getDriverGrowthHealthReport } from '@/modules/driver/application/services/driver-growth-health-service';
import { getProductGrowthCommandCenter } from '@/modules/analytics/application/services/growth-command-center-service';

type MockDb = Partial<Db> & Record<string, unknown>;

describe('Phases 113, 114 & 115 — Re-engagement System, Driver Growth & Growth Command Center', () => {
  describe('Phase 113 — Customer Re-engagement', () => {
    it('computes real dormant-user counts and only attaches a real existing promo code, never fabricated ones', async () => {
      const mockDb: MockDb = {
        booking: {
          groupBy: jest.fn().mockResolvedValue([
            { customerId: 'c1', _max: { createdAt: new Date(Date.now() - 20 * 86400000) } },
            { customerId: 'c2', _max: { createdAt: new Date(Date.now() - 40 * 86400000) } },
            { customerId: 'c3', _max: { createdAt: new Date() } },
          ]),
        } as unknown as Db['booking'],
        promotion: {
          findFirst: jest.fn().mockResolvedValue({ code: 'WEEKEND20' }),
        } as unknown as Db['promotion'],
      };

      const schedule = await getCustomerReengagementSchedule(mockDb as Db);

      expect(schedule.activeCampaigns.length).toBe(3);
      expect(schedule.activeCampaigns[0].quietHoursEnforced).toBe(true);
      expect(schedule.activeCampaigns[0].frequencyCapPerWeek).toBe(1);
      // Nothing actually dispatches these reminders yet — honestly
      // 'SCHEDULED', never a fabricated 'ACTIVE' claim.
      expect(schedule.activeCampaigns.every((c) => c.status === 'SCHEDULED')).toBe(true);
      expect(schedule.activeCampaigns[1].offerCodeAttached).toBe('WEEKEND20');
      // 2 of the 3 mocked customers are inactive 14+ days.
      expect(schedule.totalDormantUsersCount).toBe(2);
    });

    it('omits offerCodeAttached when no real active promotion exists, rather than a fabricated code', async () => {
      const mockDb: MockDb = {
        booking: { groupBy: jest.fn().mockResolvedValue([]) } as unknown as Db['booking'],
        promotion: { findFirst: jest.fn().mockResolvedValue(null) } as unknown as Db['promotion'],
      };

      const schedule = await getCustomerReengagementSchedule(mockDb as Db);

      expect(schedule.activeCampaigns[1].offerCodeAttached).toBeUndefined();
      expect(schedule.totalDormantUsersCount).toBe(0);
    });
  });

  describe('Phase 114 — Driver Growth & Marketplace Health', () => {
    it('builds a real 3-stage activation funnel from real verification/approval statuses', async () => {
      const mockDb: MockDb = {
        driverProfile: {
          count: jest
            .fn()
            .mockResolvedValueOnce(80) // total
            .mockResolvedValueOnce(60) // available
            .mockResolvedValueOnce(70) // verified
            .mockResolvedValueOnce(65), // approved/activated
        } as unknown as Db['driverProfile'],
        booking: { findMany: jest.fn().mockResolvedValue([]) } as unknown as Db['booking'],
      };

      const report = await getDriverGrowthHealthReport(mockDb as Db);

      expect(report.driverActivationFunnel.map((s) => s.stageName)).toEqual([
        'SUBMITTED',
        'DOCUMENTS_VERIFIED',
        'ACTIVATED',
      ]);
      expect(report.driverActivationFunnel[2].count).toBe(65);
      // 60 available / 65 activated ≈ 92.3% ≥ 60% → SUFFICIENT
      expect(report.marketplaceSupplyStatus).toBe('SUFFICIENT');
      expect(report.marketplaceHealthAnswer).toContain('YES');
    });

    it('flags a real supply deficit instead of an unconditional SUFFICIENT verdict', async () => {
      const mockDb: MockDb = {
        driverProfile: {
          count: jest
            .fn()
            .mockResolvedValueOnce(80)
            .mockResolvedValueOnce(5) // only 5 available
            .mockResolvedValueOnce(70)
            .mockResolvedValueOnce(65), // of 65 activated
        } as unknown as Db['driverProfile'],
        booking: { findMany: jest.fn().mockResolvedValue([]) } as unknown as Db['booking'],
      };

      const report = await getDriverGrowthHealthReport(mockDb as Db);

      expect(report.marketplaceSupplyStatus).toBe('SUPPLY_DEFICIT');
      expect(report.marketplaceHealthAnswer).toContain('AT RISK');
    });
  });

  describe('Phase 115 — Product Growth Command Center', () => {
    it('computes real metrics across CUSTOMERS, BOOKINGS, DRIVERS, GROWTH, and QUALITY, honestly zeroing what has no real data source', async () => {
      const mockDb: MockDb = {
        user: { count: jest.fn().mockResolvedValue(1200) } as unknown as Db['user'],
        driverProfile: {
          count: jest
            .fn()
            .mockResolvedValueOnce(150) // total
            .mockResolvedValueOnce(90) // available
            .mockResolvedValueOnce(120), // approved
        } as unknown as Db['driverProfile'],
        booking: {
          count: jest
            .fn()
            .mockResolvedValueOnce(850) // total
            .mockResolvedValueOnce(700) // completed
            .mockResolvedValueOnce(50), // cancelled
          groupBy: jest.fn().mockResolvedValue([]),
        } as unknown as Db['booking'],
        referral: {
          count: jest.fn().mockResolvedValueOnce(340).mockResolvedValueOnce(140),
        } as unknown as Db['referral'],
        promotion: { count: jest.fn().mockResolvedValue(6) } as unknown as Db['promotion'],
        driverRatingSummary: {
          aggregate: jest.fn().mockResolvedValue({ _avg: { averageRating: 4.6 } }),
        } as unknown as Db['driverRatingSummary'],
        supportTicket: {
          count: jest.fn().mockResolvedValueOnce(2).mockResolvedValueOnce(185),
        } as unknown as Db['supportTicket'],
      };

      const commandCenter = await getProductGrowthCommandCenter(mockDb as Db);

      expect(commandCenter.customers.newUsersCount).toBe(1200);
      expect(commandCenter.bookings.completedCount).toBe(700);
      expect(commandCenter.bookings.completionRatePercent).toBeCloseTo(82.4, 1);
      expect(commandCenter.drivers.availableCount).toBe(90);
      expect(commandCenter.drivers.supplyHealthStatus).toBe('HEALTHY');
      expect(commandCenter.growth.referralSignupsCount).toBe(340);
      expect(commandCenter.growth.activeOffersCount).toBe(6);
      expect(commandCenter.quality.averageCustomerRating).toBe(4.6);
      // No real spend/NPS/experiment-registry data exists — honestly 0,
      // never a fabricated ROI multiplier or NPS score.
      expect(commandCenter.growth.campaignRoiMultiplier).toBe(0);
      expect(commandCenter.growth.runningExperimentsCount).toBe(0);
      expect(commandCenter.quality.netPromoterScore).toBe(0);
    });
  });
});
