import 'server-only';
import { NextResponse } from 'next/server';
import { withPermission } from '@/modules/identity/authorization/route-guard';
import { PERMISSIONS } from '@/modules/identity/domain/permission-catalog';
import { getSupplyMetrics } from '@/modules/marketplace-intelligence/domain/supply-service';

export const GET = withPermission(
  PERMISSIONS.ADMIN_MARKETPLACE_INTELLIGENCE_READ,
  async (req) => {
    try {
      const searchParams = req.nextUrl.searchParams;
      const zoneId = searchParams.get('zoneId') || undefined;
      const vehicleCategory = searchParams.get('vehicleCategory') || undefined;

      const supplyMetrics = await getSupplyMetrics(zoneId, vehicleCategory);
      return NextResponse.json(supplyMetrics);
    } catch (error: unknown) {
      return NextResponse.json({ error: (error as Error).message || 'Internal Server Error' }, { status: 500 });
    }
  },
);
