import 'server-only';
import { NextResponse } from 'next/server';
import { withPermission } from '@/modules/identity/authorization/route-guard';
import { PERMISSIONS } from '@/modules/identity/domain/permission-catalog';
import { resumeScheduledRide } from '@/modules/scheduled-rides/application/scheduled-ride-service';

type RouteParams = { params: Promise<{ id: string }> };

export const POST = withPermission<RouteParams>(
  PERMISSIONS.SCHEDULED_RIDES_MANAGE,
  async (_req, { principal }, routeContext) => {
    try {
      const { id } = await routeContext!.params;
      if (!id) {
        return NextResponse.json(
          { success: false, error: 'Missing scheduled ride ID' },
          { status: 400 },
        );
      }

      const ride = await resumeScheduledRide(id, principal.userId);
      return NextResponse.json({ success: true, data: ride }, { status: 200 });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to resume scheduled ride';
      return NextResponse.json({ success: false, error: message }, { status: 400 });
    }
  },
);
