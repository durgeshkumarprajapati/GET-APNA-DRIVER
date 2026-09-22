import { NextResponse, type NextRequest } from 'next/server';
import { withPermission } from '@/modules/identity/authorization/route-guard';
import { PERMISSIONS } from '@/modules/identity/domain/permission-catalog';
import { TripReliabilityService } from '@/modules/trip-reliability/trip-reliability-service';
import { toErrorResponse } from '@/shared/errors/app-error';

type RouteParams = { params: Promise<{ incidentId: string }> };
const service = new TripReliabilityService();

export const POST = withPermission<RouteParams>(
  PERMISSIONS.ADMIN_INCIDENT_MANAGE,
  async (req: NextRequest, { principal }, routeContext) => {
    try {
      const { incidentId } = await routeContext!.params;
      const body = await req.json().catch(() => ({}));
      const updated = await service.resolveIncident(incidentId, principal.userId, body.notes);

      if (!updated) {
        return NextResponse.json({ error: 'INCIDENT_NOT_FOUND' }, { status: 404 });
      }

      return NextResponse.json({ success: true, data: updated }, { status: 200 });
    } catch (err: unknown) {
      return toErrorResponse(err, req.nextUrl.pathname);
    }
  },
);
