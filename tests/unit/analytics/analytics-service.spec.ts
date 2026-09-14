import { parseAnalyticsDateRange, getAdminAnalyticsMetrics } from '@/modules/analytics/analytics-service';

describe('Phase 31 Objective B — Admin Analytics & BI Service', () => {
  describe('parseAnalyticsDateRange', () => {
    it('parses range "today" to current date start', () => {
      const parsed = parseAnalyticsDateRange('today');
      expect(parsed.rangeKey).toBe('today');
      expect(parsed.startDate.getTime()).toBeLessThanOrEqual(parsed.endDate.getTime());
    });

    it('parses range "7d" correctly', () => {
      const parsed = parseAnalyticsDateRange('7d');
      expect(parsed.rangeKey).toBe('7d');
      const diffDays = (parsed.endDate.getTime() - parsed.startDate.getTime()) / (24 * 60 * 60 * 1000);
      expect(Math.round(diffDays)).toBe(7);
    });

    it('parses range "90d" correctly', () => {
      const parsed = parseAnalyticsDateRange('90d');
      expect(parsed.rangeKey).toBe('90d');
      const diffDays = (parsed.endDate.getTime() - parsed.startDate.getTime()) / (24 * 60 * 60 * 1000);
      expect(Math.round(diffDays)).toBe(90);
    });

    it('caps custom date range at 180 days max to prevent DB overload', () => {
      const oldDate = new Date('2020-01-01').toISOString();
      const now = new Date().toISOString();
      const parsed = parseAnalyticsDateRange('custom', oldDate, now);
      expect(parsed.rangeKey).toBe('custom');
      const diffDays = (parsed.endDate.getTime() - parsed.startDate.getTime()) / (24 * 60 * 60 * 1000);
      expect(diffDays).toBeLessThanOrEqual(181);
    });

    it('defaults to 30d if invalid range supplied', () => {
      const parsed = parseAnalyticsDateRange('invalid_preset');
      expect(parsed.rangeKey).toBe('30d');
    });
  });

  describe('getAdminAnalyticsMetrics Database Integration', () => {
    it('returns authoritative metrics shape without errors', async () => {
      const dateRange = parseAnalyticsDateRange('30d');
      const metrics = await getAdminAnalyticsMetrics(dateRange);

      expect(metrics).toBeDefined();
      expect(metrics.dateRange.rangeKey).toBe('30d');

      // Bookings section
      expect(typeof metrics.bookings.total).toBe('number');
      expect(typeof metrics.bookings.completed).toBe('number');
      expect(typeof metrics.bookings.completionRate).toBe('number');
      expect(metrics.bookings.completionRate).toBeGreaterThanOrEqual(0);

      // Financial section
      expect(typeof metrics.financial.grossMerchandiseValue).toBe('number');
      expect(typeof metrics.financial.netPlatformRevenue).toBe('number');
      expect(typeof metrics.financial.takeRate).toBe('number');

      // Fleet & User section
      expect(typeof metrics.drivers.total).toBe('number');
      expect(typeof metrics.customers.total).toBe('number');
      expect(typeof metrics.dispatch.assignmentSuccessRate).toBe('number');
      expect(typeof metrics.safety.totalIncidents).toBe('number');
      expect(typeof metrics.support.totalTickets).toBe('number');
    });
  });
});
