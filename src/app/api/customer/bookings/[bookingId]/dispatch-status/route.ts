import 'server-only';
import { NextResponse } from 'next/server';
import { withPermission } from '@/modules/identity/authorization/route-guard';
import { PERMISSIONS } from '@/modules/identity/domain/permission-catalog';
import { getDispatchSearchState } from '@/modules/dispatch/application/dispatch-search-service';
import { getBookingById } from '@/modules/booking/application/booking-service';
import { BookingNotFoundError } from '@/modules/booking/domain/errors';

type RouteParams = { params: Promise<{ bookingId: string }> };

export const GET = withPermission<RouteParams>(
  PERMISSIONS.BOOKINGS_READ,
  async (_req, { principal }, routeContext) => {
    try {
      const { bookingId } = await routeContext!.params;
      const booking = await getBookingById(principal.userId, bookingId);

      const dispatchState = await getDispatchSearchState(bookingId);

      return NextResponse.json(
        {
          bookingId,
          status: booking.status,
          dispatchState,
          assignedDriverId: booking.driverProfileId,
        },
        { status: 200 },
      );
    } catch (err: unknown) {
      if (err instanceof BookingNotFoundError) {
        return NextResponse.json(
          { error: 'BOOKING_NOT_FOUND', message: err.message },
          { status: 404 },
        );
      }
      const message = err instanceof Error ? err.message : 'Failed to fetch dispatch status.';
      return NextResponse.json({ error: 'FETCH_DISPATCH_STATUS_FAILED', message }, { status: 500 });
    }
  },
);
