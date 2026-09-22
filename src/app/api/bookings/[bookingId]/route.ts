import { NextResponse } from 'next/server';
import { withPermission } from '@/modules/identity/authorization/route-guard';
import { PERMISSIONS } from '@/modules/identity/domain/permission-catalog';
import { getBookingById } from '@/modules/booking/application/booking-service';
import { BookingNotFoundError } from '@/modules/booking/domain/errors';
import { toErrorResponse } from '@/shared/errors/app-error';

type RouteParams = { params: Promise<{ bookingId: string }> };

export const GET = withPermission<RouteParams>(
  PERMISSIONS.BOOKINGS_READ,
  async (_req, { principal }, routeContext) => {
    try {
      const { bookingId } = await routeContext!.params;
      const booking = await getBookingById(principal.userId, bookingId);
      return NextResponse.json({ booking }, { status: 200 });
    } catch (err: unknown) {
      if (err instanceof BookingNotFoundError) {
        return NextResponse.json(
          { error: 'BOOKING_NOT_FOUND', message: err.message },
          { status: 404 },
        );
      }
      return toErrorResponse(err, _req.nextUrl.pathname);
    }
  },
);
