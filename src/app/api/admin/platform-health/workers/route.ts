import { NextResponse } from 'next/server';
import { withPermission } from '@/modules/identity/authorization/route-guard';
import { PERMISSIONS } from '@/modules/identity/domain/permission-catalog';
import { ObservabilityService } from '@/modules/observability';

export const GET = withPermission(
  PERMISSIONS.ADMIN_PLATFORM_HEALTH_READ,
  async () => {
    try {
      const data = await ObservabilityService.runDiagnostics('worker');
      return NextResponse.json({ success: true, data });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to fetch worker health';
      return NextResponse.json({ success: false, error: 'WORKER_HEALTH_FETCH_FAILED', message }, { status: 500 });
    }
  }
);
