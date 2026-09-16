import 'server-only';
import { NextResponse } from 'next/server';
import { withPermission } from '@/modules/identity/authorization/route-guard';
import { PERMISSIONS } from '@/modules/identity/domain/permission-catalog';
import { getDemandMetrics } from '@/modules/marketplace-intelligence/domain/demand-service';
import { getSupplyMetrics } from '@/modules/marketplace-intelligence/domain/supply-service';
import { generateOperationalRecommendations } from '@/modules/marketplace-intelligence/domain/recommendation-service';

export const GET = withPermission(
  PERMISSIONS.ADMIN_MARKETPLACE_INTELLIGENCE_READ,
  async (_req, { principal }) => {
    try {
      const now = new Date();
      const startDate = new Date(now.getTime() - 60 * 60 * 1000);

      const demand = await getDemandMetrics({ startDate, endDate: now });
      const supply = await getSupplyMetrics(undefined, undefined, demand.totalRequests);

      const recommendations = await generateOperationalRecommendations({
        totalRequests: demand.totalRequests,
        completedRides: demand.completedRides,
        cancelledRides: demand.cancelledRides,
        dispatchEligibleSupply: supply.dispatchEligibleDrivers,
        scheduledDemandCount: demand.scheduledDemandCount,
        zoneBreakdown: demand.zoneBreakdown,
        adminUserId: principal.userId,
      });

      return NextResponse.json(recommendations);
    } catch (error: unknown) {
      return NextResponse.json(
        { error: (error as Error).message || 'Internal Server Error' },
        { status: 500 },
      );
    }
  },
);
