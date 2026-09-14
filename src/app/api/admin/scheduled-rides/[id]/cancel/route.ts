import 'server-only';
import { NextResponse } from 'next/server';
import { withPermission } from '@/modules/identity/authorization/route-guard';
import { PERMISSIONS } from '@/modules/identity/domain/permission-catalog';
import { adminCancelScheduledRide } from '@/modules/scheduled-rides/application/scheduled-ride-service';

type RouteParams = { params: Promise<{ id: string }> };

export const POST = withPermission<RouteParams>(
  PERMISSIONS.ADMIN_SCHEDULED_RIDES_MANAGE,
  async (req, { principal }, routeContext) => {
    try {
      const { id } = await routeContext!.params;
      if (!id) {
        return NextResponse.json({ success: false, error: 'Missing scheduled ride ID' }, { status: 400 });
      }

      const body = await req.json();
      const reason = body.reason || 'Admin administrative cancellation';

      const ride = await adminCancelScheduledRide(id, reason, principal.userId);
      return NextResponse.json({ success: true, data: ride }, { status: 200 });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to cancel scheduled ride';
      return NextResponse.json({ success: false, error: message }, { status: 400 });
    }
  },
);
