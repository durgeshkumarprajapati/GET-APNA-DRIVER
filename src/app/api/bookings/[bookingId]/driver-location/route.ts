import { NextResponse } from 'next/server';
import { withPermission } from '@/modules/identity/authorization/route-guard';
import { PERMISSIONS } from '@/modules/identity/domain/permission-catalog';
import { getDriverLocationForBooking } from '@/modules/booking/application/driver-journey-service';
import { BookingNotFoundError } from '@/modules/booking/domain/errors';

type RouteParams = { params: Promise<{ bookingId: string }> };

export const GET = withPermission<RouteParams>(
  PERMISSIONS.BOOKINGS_TRACK_LOCATION,
  async (_req, { principal }, routeContext) => {
    try {
      const { bookingId } = await routeContext!.params;
      const location = await getDriverLocationForBooking(principal.userId, bookingId);
      return NextResponse.json({ location }, { status: 200 });
    } catch (err: unknown) {
      if (err instanceof BookingNotFoundError) {
        return NextResponse.json(
          { error: 'BOOKING_NOT_FOUND', message: err.message },
          { status: 404 },
        );
      }
      const message = err instanceof Error ? err.message : 'Failed to fetch driver location.';
      return NextResponse.json({ error: 'LOCATION_FETCH_FAILED', message }, { status: 500 });
    }
  },
);
