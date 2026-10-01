import 'server-only';
import { NextResponse } from 'next/server';
import { withPermission } from '@/modules/identity/authorization/route-guard';
import { PERMISSIONS } from '@/modules/identity/domain/permission-catalog';
import { getUnifiedGrowthPlatformSummary } from '@/modules/analytics/application/unified-growth-platform-service';

export const GET = withPermission(
  PERMISSIONS.ADMIN_PLATFORM_METRICS_READ,
  async (_req) => {
    const summary = await getUnifiedGrowthPlatformSummary();
    return NextResponse.json(summary, { status: 200 });
  },
);
