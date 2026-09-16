import { NextResponse } from 'next/server';
import { withPermission } from '@/modules/identity/authorization/route-guard';
import { PERMISSIONS } from '@/modules/identity/domain/permission-catalog';
import { TripReliabilityService } from '@/modules/trip-reliability/trip-reliability-service';

type RouteParams = { params: Promise<{ bookingId: string }> };
const service = new TripReliabilityService();

export const GET = withPermission<RouteParams>(
  PERMISSIONS.BOOKINGS_READ,
  async (_req, { principal }, routeContext) => {
    try {
      const { bookingId } = await routeContext!.params;
      const reliability = await service.getDriverReliabilityView(principal.userId, bookingId);

      if (!reliability) {
        return NextResponse.json({ error: 'RELIABILITY_VIEW_NOT_FOUND' }, { status: 404 });
      }

      return NextResponse.json({ reliability }, { status: 200 });
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'Failed to fetch driver trip reliability.';
      return NextResponse.json({ error: 'FETCH_FAILED', message }, { status: 500 });
    }
  },
);
