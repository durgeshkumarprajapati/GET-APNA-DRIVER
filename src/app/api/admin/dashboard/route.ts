import 'server-only';
import { NextResponse } from 'next/server';
import { withPermission } from '@/modules/identity/authorization/route-guard';
import { PERMISSIONS } from '@/modules/identity/domain/permission-catalog';
import { getAdminDashboardMetrics } from '@/modules/admin/application/services/dashboard-service';

export const GET = withPermission(PERMISSIONS.ADMIN_DASHBOARD_READ, async () => {
  const metrics = await getAdminDashboardMetrics();
  return NextResponse.json(metrics, { status: 200 });
});
