import 'server-only';
import { NextResponse } from 'next/server';
import { withPermission } from '@/modules/identity/authorization/route-guard';
import { PERMISSIONS } from '@/modules/identity/domain/permission-catalog';
import {
  getBookingFunnelAnalytics,
  getCohortRetentionAnalytics,
} from '@/modules/analytics/application/experimentation-analytics-service';

export const GET = withPermission(
  PERMISSIONS.ADMIN_PLATFORM_METRICS_READ,
  async (_req) => {
    const [funnel, cohorts] = await Promise.all([
      getBookingFunnelAnalytics(),
      getCohortRetentionAnalytics(),
    ]);

    return NextResponse.json({ funnel, cohorts }, { status: 200 });
  },
);
