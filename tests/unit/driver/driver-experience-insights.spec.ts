import {
  getDriverShiftSummary,
  getDriverEarningsBreakdown,
  getDriverPerformanceInsights,
} from '@/modules/driver/application/services/driver-experience-insights-service';
import { reportDriverIssue } from '@/modules/driver/application/services/driver-issue-report-service';

jest.mock('@/modules/review/application/driver-performance-service', () => ({
  getDriverPerformanceMetrics: jest.fn().mockResolvedValue({
    driverProfileId: 'dp-101',
    averageRating: 4.9,
    totalReviews: 125,
    ratingDistribution: { 5: 110, 4: 10, 3: 5, 2: 0, 1: 0 },
    completedTrips: 150,
    cancelledAssignedTrips: 2,
    completionRate: '0.98',
    cancellationRate: '0.02',
    averageTripValue: '450.00',
    totalEarnings: '67500.00',
  }),
}));

jest.mock('@/modules/incentive/application/services/driver-earnings-service', () => ({
  getDriverEarningsSummary: jest.fn().mockResolvedValue({
    driverProfileId: 'dp-101',
    periodEarnings: '2500.00',
    periodTrips: 6,
  }),
}));

describe('Phase 91 — Driver Experience & Earnings Engagement', () => {
  describe('Driver Shift Summary Service', () => {
    it('returns shift summary with on-duty status and trip count', async () => {
      const mockDb: any = {
        driverProfile: {
          findUnique: jest.fn().mockResolvedValue({
            availabilityStatus: 'AVAILABLE',
            updatedAt: new Date(Date.now() - 60 * 60 * 1000), // 60 mins ago
          }),
        },
        booking: {
          count: jest.fn().mockResolvedValue(5),
        },
      };

      const summary = await getDriverShiftSummary('dp-101', new Date(), mockDb);

      expect(summary.isOnDuty).toBe(true);
      expect(summary.availabilityStatus).toBe('AVAILABLE');
      expect(summary.todaysTripsCompleted).toBe(5);
      expect(summary.activeShiftDurationMinutes).toBeGreaterThanOrEqual(59);
    });
  });

  describe('Driver Earnings Breakdown Service', () => {
    it('calculates earnings breakdown and settlement status', async () => {
      const mockDb: any = {
        driverWallet: {
          findUnique: jest.fn().mockResolvedValue({
            balance: '3500.00',
            totalEarned: '75000.00',
            pendingSettlementAmount: '1200.00',
          }),
        },
      };

      const breakdown = await getDriverEarningsBreakdown('dp-101', new Date(), mockDb);

      expect(breakdown.todayNetEarnings).toBe('2500.00');
      expect(breakdown.pendingSettlementAmount).toBe('1200.00');
      expect(breakdown.settlementCycleStatus).toBe('PENDING');
      expect(Number(breakdown.commissionDeducted)).toBeGreaterThan(0);
    });
  });

  describe('Driver Performance Insights Service', () => {
    it('computes scorecard metrics and actionable tips', async () => {
      const mockDb: any = {
        bookingAssignmentAttempt: {
          count: jest.fn().mockResolvedValue(20),
        },
      };

      const insights = await getDriverPerformanceInsights('dp-101', mockDb);

      expect(insights.averageRating).toBe(4.9);
      expect(insights.completionRatePercentage).toBe(98);
      expect(insights.reliabilityScore).toBeGreaterThan(80);
      expect(insights.actionableTips.length).toBeGreaterThan(0);
    });
  });

  describe('Driver Issue Reporting Service', () => {
    it('creates support ticket and logs outbox audit event for driver issue', async () => {
      const mockDb: any = {
        $transaction: jest.fn().mockImplementation(async (cb) => {
          return cb({
            supportTicket: {
              create: jest.fn().mockResolvedValue({
                id: 'ticket-901',
                createdAt: new Date(),
              }),
            },
            auditLog: {
              create: jest.fn().mockResolvedValue({ id: 'audit-1' }),
            },
            outboxEvent: {
              create: jest.fn().mockResolvedValue({ id: 'outbox-1' }),
            },
          });
        }),
      };

      const result = await reportDriverIssue('dp-101', 'user-101', {
        issueCategory: 'FARE_DISPUTE',
        description: 'Discrepancy in toll fare for ride #b-200',
      }, mockDb);

      expect(result.ticketId).toBe('ticket-901');
      expect(result.status).toBe('OPEN');
      expect(result.issueCategory).toBe('FARE_DISPUTE');
    });
  });
});
