import { GET as getReliabilityIntelligenceRoute } from '@/app/api/admin/operations/reliability-intelligence/route';
import { NextRequest, type NextResponse } from 'next/server';
import type { AuthenticatedRouteHandler } from '@/modules/identity/authorization/route-guard';

jest.mock('@/modules/identity/authorization/route-guard', () => ({
  withPermission: <P>(permission: string, handler: AuthenticatedRouteHandler<P>) => {
    return (req: NextRequest, routeContext?: P): Promise<NextResponse> => {
      // Simulate authorized principal
      const principal = {
        userId: 'admin-user-1',
        accountStatus: 'ACTIVE' as const,
        roles: ['ADMINISTRATOR'],
        permissions: [permission],
      };
      return handler(req, { principal }, routeContext);
    };
  },
}));

jest.mock('@/modules/operations', () => ({
  getReliabilityIntelligence: jest.fn().mockResolvedValue({
    timeframeDays: 7,
    totalIncidents: 12,
    activeIncidents: 2,
    resolvedIncidents: 9,
    escalatedIncidents: 1,
    dismissedIncidents: 0,
    recoverySuccessRate: 90,
    avgResolutionTimeMinutes: 8.5,
    recurringIncidents: [
      { type: 'ASSIGNMENT_TIMEOUT', count: 7, percentage: 58.3, avgResolutionMinutes: 6.2 },
    ],
    failedRecoveryTrends: [{ failureCode: 'DRIVER_TIMEOUT', count: 1, lastOccurredAt: null }],
    recoveryAttemptsSummary: { total: 10, succeeded: 9, failed: 1, processing: 0, cancelled: 0 },
    dispatchPressure: {
      searchingBookingsCount: 3,
      delayedBookingsCount: 1,
      availableDriversCount: 10,
      activeTripsCount: 15,
      pressureRatio: 0.3,
    },
  }),
}));

describe('Phase 83 — Operations & Reliability Intelligence API Routes', () => {
  it('GET /api/admin/operations/reliability-intelligence returns structured intelligence data', async () => {
    const req = new NextRequest(
      'http://localhost:3000/api/admin/operations/reliability-intelligence?days=7',
    );
    const res = await getReliabilityIntelligenceRoute(req, undefined);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.data).toBeDefined();
    expect(body.data.recoverySuccessRate).toBe(90);
    expect(body.data.dispatchPressure.searchingBookingsCount).toBe(3);
  });
});
