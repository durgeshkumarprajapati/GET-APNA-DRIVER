import { NextResponse, type NextRequest } from 'next/server';
import { withPermission } from '@/modules/identity/authorization/route-guard';
import { PERMISSIONS } from '@/modules/identity/domain/permission-catalog';
import { TripReliabilityService } from '@/modules/trip-reliability/trip-reliability-service';

type RouteParams = { params: Promise<{ incidentId: string }> };
const service = new TripReliabilityService();

export const POST = withPermission<RouteParams>(
  PERMISSIONS.ADMIN_INCIDENT_ESCALATE,
  async (req: NextRequest, { principal }, routeContext) => {
    try {
      const { incidentId } = await routeContext!.params;
      const body = await req.json().catch(() => ({}));
      const updated = await service.escalateIncident(incidentId, principal.userId, body.reason);

      if (!updated) {
        return NextResponse.json({ error: 'INCIDENT_NOT_FOUND' }, { status: 404 });
      }

      return NextResponse.json({ success: true, data: updated }, { status: 200 });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to escalate incident.';
      return NextResponse.json({ error: 'ESCALATION_FAILED', message }, { status: 500 });
    }
  }
);
