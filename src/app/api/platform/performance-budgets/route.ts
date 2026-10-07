import 'server-only';
import { NextResponse } from 'next/server';
import { withPermission } from '@/modules/identity/authorization/route-guard';
import { PERMISSIONS } from '@/modules/identity/domain/permission-catalog';
import { getPerformanceBudgetReport } from '@/modules/observability/application/services/performance-budget-service';

export const GET = withPermission(PERMISSIONS.ADMIN_PLATFORM_METRICS_READ, async (_req) => {
  const report = await getPerformanceBudgetReport();
  return NextResponse.json(report, { status: 200 });
});
