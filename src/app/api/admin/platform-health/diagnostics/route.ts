import { NextResponse } from 'next/server';
import { withPermission } from '@/modules/identity/authorization/route-guard';
import { PERMISSIONS } from '@/modules/identity/domain/permission-catalog';
import { ObservabilityService } from '@/modules/observability';

export const GET = withPermission(PERMISSIONS.ADMIN_PLATFORM_DIAGNOSTICS_READ, async () => {
  try {
    const [database, redis, worker] = await Promise.all([
      ObservabilityService.runDiagnostics('database'),
      ObservabilityService.runDiagnostics('redis'),
      ObservabilityService.runDiagnostics('worker'),
    ]);

    return NextResponse.json({
      success: true,
      data: { database, redis, worker },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch platform diagnostics';
    return NextResponse.json(
      { success: false, error: 'DIAGNOSTICS_FETCH_FAILED', message },
      { status: 500 },
    );
  }
});
