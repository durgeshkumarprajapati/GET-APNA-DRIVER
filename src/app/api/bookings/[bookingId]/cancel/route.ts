import { NextResponse } from 'next/server';
import { withPermission } from '@/modules/identity/authorization/route-guard';
import { PERMISSIONS } from '@/modules/identity/domain/permission-catalog';
import { cancelBooking } from '@/modules/booking/application/booking-service';
import { BookingNotFoundError, BookingNotCancellableError } from '@/modules/booking/domain/errors';

type RouteParams = { params: Promise<{ bookingId: string }> };

export const POST = withPermission<RouteParams>(
  PERMISSIONS.BOOKINGS_CANCEL,
  async (req, { principal }, routeContext) => {
    try {
      const { bookingId } = await routeContext!.params;
      let reason: string | undefined;
      try {
        const body = await req.json();
        reason = body.reason;
      } catch {
        // Body optional
      }

      const booking = await cancelBooking(principal.userId, bookingId, reason);
      return NextResponse.json(
        { booking, message: 'Booking cancelled successfully.' },
        { status: 200 },
      );
    } catch (err: unknown) {
      if (err instanceof BookingNotFoundError) {
        return NextResponse.json(
          { error: 'BOOKING_NOT_FOUND', message: err.message },
          { status: 404 },
        );
      }
      if (err instanceof BookingNotCancellableError) {
        return NextResponse.json(
          { error: 'NOT_CANCELLABLE', message: err.message },
          { status: 400 },
        );
      }
      const message = err instanceof Error ? err.message : 'Failed to cancel booking.';
      return NextResponse.json({ error: 'CANCELLATION_FAILED', message }, { status: 500 });
    }
  },
);
