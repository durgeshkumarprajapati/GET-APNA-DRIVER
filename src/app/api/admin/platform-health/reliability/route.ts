import { NextResponse } from 'next/server';
import { withPermission } from '@/modules/identity/authorization/route-guard';
import { PERMISSIONS } from '@/modules/identity/domain/permission-catalog';
import { ObservabilityService } from '@/modules/observability';

export const GET = withPermission(
  PERMISSIONS.ADMIN_PLATFORM_HEALTH_READ,
  async () => {
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
      const message = error instanceof Error ? error.message : 'Failed to fetch reliability metrics';
      return NextResponse.json({ success: false, error: 'RELIABILITY_FETCH_FAILED', message }, { status: 500 });
    }
  }
);
