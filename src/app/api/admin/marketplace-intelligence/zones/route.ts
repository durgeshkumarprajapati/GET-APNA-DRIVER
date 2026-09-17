import 'server-only';
import { NextResponse } from 'next/server';
import { withPermission } from '@/modules/identity/authorization/route-guard';
import { PERMISSIONS } from '@/modules/identity/domain/permission-catalog';
import { listMarketplaceZones } from '@/modules/marketplace-intelligence/domain/zone-service';
import { getDemandMetrics } from '@/modules/marketplace-intelligence/domain/demand-service';
import { getSupplyMetrics } from '@/modules/marketplace-intelligence/domain/supply-service';

export const GET = withPermission(PERMISSIONS.ADMIN_MARKETPLACE_INTELLIGENCE_READ, async () => {
  try {
    const zones = await listMarketplaceZones();

    const now = new Date();
    const startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    const demand = await getDemandMetrics({ startDate, endDate: now });
    const supply = await getSupplyMetrics();

    const zonesWithMetrics = zones.map((z) => {
      const zDemand = demand.zoneBreakdown.find((zb) => zb.zoneId === z.id);
      const zSupply = supply.zoneSupplyBreakdown.find((zb) => zb.zoneId === z.id);
      return {
        ...z,
        requests: zDemand?.requests || 0,
        completed: zDemand?.completed || 0,
        cancelled: zDemand?.cancelled || 0,
        availableSupply: zSupply?.availableSupply || 0,
        eligibleSupply: zSupply?.eligibleSupply || 0,
      };
    });

    return NextResponse.json(zonesWithMetrics);
  } catch (error: unknown) {
    return NextResponse.json(
      { error: (error as Error).message || 'Internal Server Error' },
      { status: 500 },
    );
  }
});
