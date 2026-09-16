import { NextResponse } from 'next/server';
import { withPermission } from '@/modules/identity/authorization/route-guard';
import { PERMISSIONS } from '@/modules/identity/domain/permission-catalog';
import { ObservabilityService } from '@/modules/observability';

export const POST = withPermission(PERMISSIONS.ADMIN_PLATFORM_DIAGNOSTICS_READ, async () => {
  try {
    const data = await ObservabilityService.runDiagnostics('redis');
    return NextResponse.json({ success: true, data });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Redis diagnostic check failed';
    return NextResponse.json(
      { success: false, error: 'REDIS_DIAGNOSTIC_FAILED', message },
      { status: 500 },
    );
  }
});
