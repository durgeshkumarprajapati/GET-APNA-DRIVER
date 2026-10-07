import 'server-only';
import { NextResponse } from 'next/server';
import { withPermission } from '@/modules/identity/authorization/route-guard';
import { PERMISSIONS } from '@/modules/identity/domain/permission-catalog';
import { getProductGrowthCommandCenter } from '@/modules/analytics/application/services/growth-command-center-service';

export const GET = withPermission(PERMISSIONS.ADMIN_PLATFORM_METRICS_READ, async (_req) => {
  const data = await getProductGrowthCommandCenter();
  return NextResponse.json(data, { status: 200 });
});
