import 'server-only';
import { NextRequest, NextResponse } from 'next/server';
import { withPermission } from '@/modules/identity/authorization/route-guard';
import { PERMISSIONS } from '@/modules/identity/domain/permission-catalog';
import {
  getAdminAnalyticsMetrics,
  parseAnalyticsDateRange,
} from '@/modules/analytics/analytics-service';
import { toErrorResponse } from '@/shared/errors/app-error';

export const GET = withPermission(PERMISSIONS.ADMIN_DASHBOARD_READ, async (req: NextRequest) => {
  try {
    const { searchParams } = req.nextUrl;
    const range = searchParams.get('range');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    const dateRange = parseAnalyticsDateRange(range, startDate, endDate);
    const metrics = await getAdminAnalyticsMetrics(dateRange);

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      metrics,
    });
  } catch (err: unknown) {
    return toErrorResponse(err, req.nextUrl.pathname);
  }
});
