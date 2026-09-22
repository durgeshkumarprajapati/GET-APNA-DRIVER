import { NextResponse, type NextRequest } from 'next/server';
import { withPermission } from '@/modules/identity/authorization/route-guard';
import { PERMISSIONS } from '@/modules/identity/domain/permission-catalog';
import { ObservabilityService } from '@/modules/observability';
import { toErrorResponse } from '@/shared/errors/app-error';

export const GET = withPermission(
  PERMISSIONS.ADMIN_PLATFORM_DIAGNOSTICS_READ,
  async (request: NextRequest) => {
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
      return toErrorResponse(error, request.nextUrl.pathname);
    }
  },
);
