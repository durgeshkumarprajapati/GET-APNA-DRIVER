import { NextResponse } from 'next/server';
import { withPermission } from '@/modules/identity/authorization/route-guard';
import { PERMISSIONS } from '@/modules/identity/domain/permission-catalog';
import { TripReliabilityService } from '@/modules/trip-reliability/trip-reliability-service';

type RouteParams = { params: Promise<{ incidentId: string }> };
const service = new TripReliabilityService();

export const POST = withPermission<RouteParams>(
  PERMISSIONS.ADMIN_INCIDENT_RECOVER,
  async (_req, { principal }, routeContext) => {
    try {
      const { incidentId } = await routeContext!.params;
      const result = await service.triggerAutomatedRecovery(incidentId, principal.userId);
      return NextResponse.json({ success: result.success, data: result }, { status: 200 });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to execute recovery.';
      return NextResponse.json({ error: 'RECOVERY_FAILED', message }, { status: 500 });
    }
  }
);
