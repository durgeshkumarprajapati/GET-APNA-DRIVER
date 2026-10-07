import 'server-only';
import { NextResponse } from 'next/server';
import { withPermission } from '@/modules/identity/authorization/route-guard';
import { PERMISSIONS } from '@/modules/identity/domain/permission-catalog';
import { getDriverGrowthHealthReport } from '@/modules/driver/application/services/driver-growth-health-service';

export const GET = withPermission(PERMISSIONS.ADMIN_PLATFORM_METRICS_READ, async (_req) => {
  const report = await getDriverGrowthHealthReport();
  return NextResponse.json(report, { status: 200 });
});
