import { NextResponse, type NextRequest } from 'next/server';
import { withPermission } from '@/modules/identity/authorization/route-guard';
import { PERMISSIONS } from '@/modules/identity/domain/permission-catalog';
import { ObservabilityService } from '@/modules/observability';
import { toErrorResponse } from '@/shared/errors/app-error';

export const GET = withPermission(
  PERMISSIONS.ADMIN_PLATFORM_HEALTH_READ,
  async (request: NextRequest) => {
    try {
      const [slos, incidentCorrelation, activeAlerts] = await Promise.all([
        ObservabilityService.getSlos(),
        ObservabilityService.getIncidentCorrelation(),
        ObservabilityService.getActiveAlerts(),
      ]);

      return NextResponse.json({
        success: true,
        data: {
          slos,
          incidentCorrelation,
          activeAlerts,
        },
      });
    } catch (error) {
      return toErrorResponse(error, request.nextUrl.pathname);
    }
  },
);
