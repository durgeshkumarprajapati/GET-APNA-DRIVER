import 'server-only';
import { NextResponse } from 'next/server';
import { withPermission } from '@/modules/identity/authorization/route-guard';
import { PERMISSIONS } from '@/modules/identity/domain/permission-catalog';
import { getJourneyDetails } from '@/modules/trip-execution/application/journey-orchestration-service';

type RouteParams = { params: Promise<{ bookingId: string }> };

export const GET = withPermission<RouteParams>(
  PERMISSIONS.BOOKINGS_READ,
  async (_req, { principal }, routeContext) => {
    try {
      const { bookingId } = await routeContext!.params;
      const result = await getJourneyDetails(bookingId, 'CUSTOMER', principal.userId);

      return NextResponse.json({ journey: result.customer }, { status: 200 });
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'Failed to fetch customer journey details.';
      if (message.includes('not found')) {
        return NextResponse.json({ error: 'BOOKING_NOT_FOUND', message }, { status: 404 });
      }
      if (message.includes('Unauthorized')) {
        return NextResponse.json(
          { error: 'UNAUTHORIZED_JOURNEY_ACCESS', message },
          { status: 403 },
        );
      }
      return NextResponse.json({ error: 'FETCH_JOURNEY_FAILED', message }, { status: 500 });
    }
  },
);
