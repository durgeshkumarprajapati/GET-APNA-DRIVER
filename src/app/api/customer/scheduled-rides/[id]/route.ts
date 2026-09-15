import 'server-only';
import { NextResponse } from 'next/server';
import { withPermission } from '@/modules/identity/authorization/route-guard';
import { PERMISSIONS } from '@/modules/identity/domain/permission-catalog';
import {
  getScheduledRideById,
  cancelScheduledRide,
} from '@/modules/scheduled-rides/application/scheduled-ride-service';

type RouteParams = { params: Promise<{ id: string }> };

export const GET = withPermission<RouteParams>(
  PERMISSIONS.SCHEDULED_RIDES_READ,
  async (_req, { principal }, routeContext) => {
    try {
      const { id } = await routeContext!.params;
      if (!id) {
        return NextResponse.json(
          { success: false, error: 'Missing scheduled ride ID' },
          { status: 400 },
        );
      }

      const ride = await getScheduledRideById(id, principal.userId);
      return NextResponse.json({ success: true, data: ride }, { status: 200 });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Scheduled ride not found';
      return NextResponse.json({ success: false, error: message }, { status: 404 });
    }
  },
);

export const DELETE = withPermission<RouteParams>(
  PERMISSIONS.SCHEDULED_RIDES_MANAGE,
  async (req, { principal }, routeContext) => {
    try {
      const { id } = await routeContext!.params;
      if (!id) {
        return NextResponse.json(
          { success: false, error: 'Missing scheduled ride ID' },
          { status: 400 },
        );
      }

      const { searchParams } = new URL(req.url);
      const reason = searchParams.get('reason') || undefined;

      const ride = await cancelScheduledRide(id, principal.userId, reason);
      return NextResponse.json({ success: true, data: ride }, { status: 200 });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to cancel scheduled ride';
      return NextResponse.json({ success: false, error: message }, { status: 400 });
    }
  },
);
