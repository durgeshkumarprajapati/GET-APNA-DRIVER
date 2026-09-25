import 'server-only';
import { NextResponse } from 'next/server';
import { withPermission } from '@/modules/identity/authorization/route-guard';
import { PERMISSIONS } from '@/modules/identity/domain/permission-catalog';
import { getDispatchSearchState } from '@/modules/dispatch/application/dispatch-search-service';
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

      const dispatchState = await getDispatchSearchState(bookingId);

      const isDriverRejected =
        booking.status === 'CANCELLED' &&
        (booking.cancellationReason?.toLowerCase().includes('rejected') ||
          (booking.cancelledBy !== null && booking.cancelledBy !== principal.userId));

      const isNoDriverCancelled =
        booking.status === 'CANCELLED' &&
        booking.cancellationReason === 'NO_ACTIVE_DRIVER_NEARBY';

      const cancellationMessage = isDriverRejected
        ? 'Booking rejected by driver.'
        : booking.cancellationReason || 'No active driver found near you.';

      return NextResponse.json(
        {
          bookingId,
          status: booking.status,
          dispatchState,
          assignedDriverId: booking.driverProfileId,
          dispatchStatus: {
            bookingId,
            status: booking.status,
            searchStartedAt: dispatchState?.searchStartedAt?.toISOString() || null,
            searchDeadlineAt: dispatchState?.searchDeadlineAt?.toISOString() || null,
            remainingSeconds: dispatchState?.remainingSeconds ?? 0,
            hasExpired: dispatchState?.hasExpired ?? false,
            isNoDriverCancelled,
            isDriverRejectedCancelled: isDriverRejected,
            cancellationReason: booking.cancellationReason,
            cancellationMessage,
          },
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
      return toErrorResponse(err, _req.nextUrl.pathname);
    }
  },
);
