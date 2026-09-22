import { NextResponse, type NextRequest } from 'next/server';
import { withPermission } from '@/modules/identity/authorization/route-guard';
import { PERMISSIONS } from '@/modules/identity/domain/permission-catalog';
import { ObservabilityService } from '@/modules/observability';
import { toErrorResponse } from '@/shared/errors/app-error';

export const POST = withPermission(
  PERMISSIONS.ADMIN_PLATFORM_DIAGNOSTICS_READ,
  async (request: NextRequest) => {
    try {
      const data = await ObservabilityService.runDiagnostics('worker');
      return NextResponse.json({ success: true, data });
    } catch (error) {
      return toErrorResponse(error, request.nextUrl.pathname);
    }
  },
);
