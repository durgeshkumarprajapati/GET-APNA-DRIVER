import { NextResponse, type NextRequest } from 'next/server';
import { withPermission } from '@/modules/identity/authorization/route-guard';
import { PERMISSIONS } from '@/modules/identity/domain/permission-catalog';
import { ObservabilityService } from '@/modules/observability';

export const GET = withPermission(
  PERMISSIONS.ADMIN_PLATFORM_METRICS_READ,
  async (request: NextRequest) => {
    try {
      const { searchParams } = new URL(request.url);
      const metricName = searchParams.get('metric') || 'api.request';
      const dimension = searchParams.get('dimension') || 'GLOBAL';
      const hours = Math.min(168, Math.max(1, Number(searchParams.get('hours') || 24)));

      const endTime = new Date();
      const startTime = new Date(endTime.getTime() - hours * 60 * 60 * 1000);

      const data = await ObservabilityService.getMetricAggregates(
        metricName,
        startTime,
        endTime,
        dimension
      );

      return NextResponse.json({ success: true, data });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to fetch performance metrics';
      return NextResponse.json({ success: false, error: 'PERFORMANCE_METRICS_FETCH_FAILED', message }, { status: 500 });
    }
  }
);
