import 'server-only';
import { NextResponse } from 'next/server';
import { withPermission } from '@/modules/identity/authorization/route-guard';
import { PERMISSIONS } from '@/modules/identity/domain/permission-catalog';
import { getMarketplaceZoneById } from '@/modules/marketplace-intelligence/domain/zone-service';
import { getDemandMetrics } from '@/modules/marketplace-intelligence/domain/demand-service';
import { getSupplyMetrics } from '@/modules/marketplace-intelligence/domain/supply-service';
import { defaultForecastProvider } from '@/modules/marketplace-intelligence/domain/forecast-service';
import { evaluateMarketplaceHealth } from '@/modules/marketplace-intelligence/domain/marketplace-health-service';

export const GET = withPermission(PERMISSIONS.ADMIN_MARKETPLACE_INTELLIGENCE_READ, async (req) => {
  try {
    const zoneId = req.nextUrl.pathname.split('/').pop() || '';
    const zone = await getMarketplaceZoneById(zoneId);
    if (!zone) {
      return NextResponse.json({ error: 'Zone not found' }, { status: 404 });
    }

    const now = new Date();
    const startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    const demand = await getDemandMetrics({ startDate, endDate: now, zoneId });
    const supply = await getSupplyMetrics(zoneId, undefined, demand.totalRequests);
    const forecast = await defaultForecastProvider.generateForecast('1h', zoneId);
    const health = evaluateMarketplaceHealth({
      totalRequests: demand.totalRequests,
      completedRides: demand.completedRides,
      cancelledRides: demand.cancelledRides,
      dispatchEligibleSupply: supply.dispatchEligibleDrivers,
    });

    return NextResponse.json({
      zone,
      health,
      demand,
      supply,
      forecast,
      generatedAt: now.toISOString(),
    });
  } catch (error: unknown) {
    return NextResponse.json(
      { error: (error as Error).message || 'Internal Server Error' },
      { status: 500 },
    );
  }
});
