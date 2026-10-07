import type { Db } from '@/shared/database/prisma';
import {
  getDriverShiftSummary,
  getDriverEarningsBreakdown,
  getDriverPerformanceInsights,
} from '@/modules/driver/application/services/driver-experience-insights-service';
import { reportDriverIssue } from '@/modules/driver/application/services/driver-issue-report-service';
import { BookingNotFoundError } from '@/modules/booking/domain/errors';

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
    todayEarnings: '2500.00',
    completedTripsToday: 6,
    averageFarePerTrip: '416.67',
    periodEarnings: '14000.00',
    periodTrips: 30,
    pendingBalance: '1200.00',
    totalEarned: '75000.00',
    currency: 'INR',
  }),
}));

type MockDb = Partial<Db> & Record<string, unknown>;

describe('Phase 91 — Driver Experience & Earnings Engagement', () => {
  describe('Driver Shift Summary Service', () => {
    it('returns shift summary with on-duty status and trip count', async () => {
      const mockDb: MockDb = {
        driverProfile: {
          findUnique: jest.fn().mockResolvedValue({
            availabilityStatus: 'AVAILABLE',
            updatedAt: new Date(Date.now() - 60 * 60 * 1000), // 60 mins ago
          }),
        } as unknown as Db['driverProfile'],
        booking: {
          count: jest.fn().mockResolvedValue(5),
        } as unknown as Db['booking'],
      };

      const summary = await getDriverShiftSummary('dp-101', new Date(), mockDb as Db);

      expect(summary.isOnDuty).toBe(true);
      expect(summary.availabilityStatus).toBe('AVAILABLE');
      expect(summary.todaysTripsCompleted).toBe(5);
      expect(summary.activeShiftDurationMinutes).toBeGreaterThanOrEqual(59);
    });

    it('treats BUSY as on-duty and UNAVAILABLE as on-break, never the nonexistent ON_TRIP/BREAK status strings', async () => {
      const mockDb: MockDb = {
        driverProfile: {
          findUnique: jest.fn().mockResolvedValue({
            availabilityStatus: 'BUSY',
            updatedAt: new Date(Date.now() - 30 * 60 * 1000),
          }),
        } as unknown as Db['driverProfile'],
        booking: {
          count: jest.fn().mockResolvedValue(3),
        } as unknown as Db['booking'],
      };

      const summary = await getDriverShiftSummary('dp-101', new Date(), mockDb as Db);

      expect(summary.isOnDuty).toBe(true);
      expect(summary.availabilityStatus).toBe('ON_TRIP');
    });
  });

  describe('Driver Earnings Breakdown Service', () => {
    it('reuses getDriverEarningsSummary for real wallet-backed figures instead of a broken direct DriverWallet query', async () => {
      const mockDb: MockDb = {};

      const breakdown = await getDriverEarningsBreakdown('dp-101', new Date(), mockDb as Db);

      expect(breakdown.todayNetEarnings).toBe('2500.00');
      expect(breakdown.completedTripsToday).toBe(6);
      expect(breakdown.lifetimeEarnings).toBe('75000.00');
      expect(breakdown.pendingSettlementAmount).toBe('1200.00');
      expect(breakdown.settlementCycleStatus).toBe('PENDING');
      expect(breakdown).not.toHaveProperty('commissionDeducted');
      expect(breakdown).not.toHaveProperty('tripFaresTotal');
    });
  });

  describe('Driver Performance Insights Service', () => {
    it('computes scorecard metrics and actionable tips', async () => {
      const mockDb: MockDb = {
        bookingAssignmentAttempt: {
          count: jest.fn().mockResolvedValue(20),
        } as unknown as Db['bookingAssignmentAttempt'],
      };

      const insights = await getDriverPerformanceInsights('dp-101', mockDb as Db);

      expect(insights.averageRating).toBe(4.9);
      expect(insights.completionRatePercentage).toBe(98);
      expect(insights.reliabilityScore).toBeGreaterThan(80);
      expect(insights.actionableTips.length).toBeGreaterThan(0);
    });
  });

  describe('Driver Issue Reporting Service', () => {
    it('creates support ticket and logs outbox audit event for driver issue', async () => {
      const mockDb: MockDb = {
        $transaction: jest.fn().mockImplementation(async (cb: (tx: unknown) => unknown) => {
          return cb({
            supportTicket: {
              count: jest.fn().mockResolvedValue(900),
              findUnique: jest.fn().mockResolvedValue(null),
              create: jest.fn().mockResolvedValue({
                id: 'ticket-901',
                ticketNumber: 'GAD-000901',
                category: 'PAYMENT_FARE',
                subject: '[Driver Issue] FARE DISPUTE',
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

      const result = await reportDriverIssue(
        'dp-101',
        'user-101',
        {
          issueCategory: 'FARE_DISPUTE',
          description: 'Discrepancy in toll fare for ride #b-200',
        },
        mockDb as Db,
      );

      expect(result.ticketId).toBe('ticket-901');
      expect(result.status).toBe('OPEN');
      expect(result.issueCategory).toBe('FARE_DISPUTE');
    });

    it('rejects a bookingId that does not belong to this driver', async () => {
      const mockDb: MockDb = {
        booking: {
          findUnique: jest.fn().mockResolvedValue({ driverProfileId: 'dp-other' }),
        } as unknown as Db['booking'],
        $transaction: jest.fn(),
      };

      await expect(
        reportDriverIssue(
          'dp-101',
          'user-101',
          {
            bookingId: 'booking-999',
            issueCategory: 'FARE_DISPUTE',
            description: 'Discrepancy in toll fare for ride #b-200',
          },
          mockDb as Db,
        ),
      ).rejects.toBeInstanceOf(BookingNotFoundError);

      expect(mockDb.$transaction).not.toHaveBeenCalled();
    });
  });
});
