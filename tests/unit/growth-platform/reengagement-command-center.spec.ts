import { getCustomerReengagementSchedule } from '@/modules/customer/application/services/customer-reengagement-service';
import { getDriverGrowthHealthReport } from '@/modules/driver/application/services/driver-growth-health-service';
import { getProductGrowthCommandCenter } from '@/modules/analytics/application/services/growth-command-center-service';

describe('Phases 113, 114 & 115 — Re-engagement System, Driver Growth & Growth Command Center', () => {
  it('Phase 113: schedules lifecycle-based inactive customer re-engagement campaigns', async () => {
    const schedule = await getCustomerReengagementSchedule();
    expect(schedule.activeCampaigns.length).toBe(3);
    expect(schedule.activeCampaigns[0].quietHoursEnforced).toBe(true);
    expect(schedule.activeCampaigns[0].frequencyCapPerWeek).toBe(1);
  });

  it('Phase 114: answers marketplace driver growth and peak coverage health questions', async () => {
    const mockDb: any = {
      driverProfile: { count: jest.fn().mockResolvedValue(80) },
    };

    const report = await getDriverGrowthHealthReport(mockDb);
    expect(report.marketplaceSupplyStatus).toBe('SUFFICIENT');
    expect(report.marketplaceHealthAnswer).toContain('YES');
  });

  it('Phase 115: provides Product Growth Command Center dashboard across CUSTOMERS, BOOKINGS, DRIVERS, GROWTH, and QUALITY', async () => {
    const mockDb: any = {
      user: { count: jest.fn().mockResolvedValue(1200) },
      driverProfile: { count: jest.fn().mockResolvedValue(150) },
      booking: { count: jest.fn().mockResolvedValue(850) },
    };

    const commandCenter = await getProductGrowthCommandCenter(mockDb);
    expect(commandCenter.customers.newUsersCount).toBe(1200);
    expect(commandCenter.bookings.completedCount).toBeDefined();
    expect(commandCenter.drivers.supplyHealthStatus).toBe('HEALTHY');
    expect(commandCenter.quality.averageCustomerRating).toBeGreaterThan(4.5);
  });
});
