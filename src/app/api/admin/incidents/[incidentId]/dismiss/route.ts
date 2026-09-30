import 'server-only';
import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { withPermission } from '@/modules/identity/authorization/route-guard';
import { PERMISSIONS } from '@/modules/identity/domain/permission-catalog';
import { TripReliabilityService } from '@/modules/trip-reliability/trip-reliability-service';
import { toErrorResponse } from '@/shared/errors/app-error';

type RouteParams = { params: Promise<{ incidentId: string }> };
const service = new TripReliabilityService();

const dismissSchema = z.object({
  reason: z.string().trim().min(1, 'A reason is required to dismiss an incident.').max(500),
});

export const POST = withPermission<RouteParams>(
  PERMISSIONS.ADMIN_INCIDENT_MANAGE,
  async (req: NextRequest, { principal }, routeContext) => {
    try {
      const { incidentId } = await routeContext!.params;
      const body = dismissSchema.parse(await req.json());
      const updated = await service.dismissIncident(incidentId, principal.userId, body.reason);

      if (!updated) {
        return NextResponse.json({ error: 'INCIDENT_NOT_FOUND' }, { status: 404 });
      }

      return NextResponse.json({ success: true, data: updated }, { status: 200 });
    } catch (err: unknown) {
      return toErrorResponse(err, req.nextUrl.pathname);
    }
  },
);
