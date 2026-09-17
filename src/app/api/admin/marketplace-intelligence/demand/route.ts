import 'server-only';
import { NextResponse } from 'next/server';
import { withPermission } from '@/modules/identity/authorization/route-guard';
import { PERMISSIONS } from '@/modules/identity/domain/permission-catalog';
import { parseAnalyticsDateRange } from '@/modules/analytics/analytics-service';
import { getDemandMetrics } from '@/modules/marketplace-intelligence/domain/demand-service';

export const GET = withPermission(PERMISSIONS.ADMIN_MARKETPLACE_INTELLIGENCE_READ, async (req) => {
  try {
    const searchParams = req.nextUrl.searchParams;
    const rangeParam = searchParams.get('range');
    const startParam = searchParams.get('start');
    const endParam = searchParams.get('end');
    const zoneId = searchParams.get('zoneId') || undefined;
    const vehicleCategory = searchParams.get('vehicleCategory') || undefined;

    const dateRange = parseAnalyticsDateRange(rangeParam, startParam, endParam);

    const demandMetrics = await getDemandMetrics({
      startDate: dateRange.startDate,
      endDate: dateRange.endDate,
      zoneId,
      vehicleCategory,
    });

    return NextResponse.json(demandMetrics);
  } catch (error: unknown) {
    return NextResponse.json(
      { error: (error as Error).message || 'Internal Server Error' },
      { status: 500 },
    );
  }
});
