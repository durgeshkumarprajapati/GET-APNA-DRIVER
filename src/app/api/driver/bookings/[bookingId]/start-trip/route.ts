import { NextResponse } from 'next/server';
import { withPermission } from '@/modules/identity/authorization/route-guard';
import { PERMISSIONS } from '@/modules/identity/domain/permission-catalog';
import { startTrip } from '@/modules/booking/application/driver-journey-service';
import {
  BookingNotFoundError,
  InvalidBookingStatusTransitionError,
} from '@/modules/booking/domain/errors';

type RouteParams = { params: Promise<{ bookingId: string }> };

export const POST = withPermission<RouteParams>(
  PERMISSIONS.DRIVER_JOURNEY_MANAGE,
  async (_req, { principal }, routeContext) => {
    try {
      const { bookingId } = await routeContext!.params;
      const booking = await startTrip(principal.userId, bookingId);
      return NextResponse.json({ booking, message: 'Trip is now in progress.' }, { status: 200 });
    } catch (err: unknown) {
      if (err instanceof BookingNotFoundError) {
        return NextResponse.json(
          { error: 'BOOKING_NOT_FOUND', message: err.message },
          { status: 404 },
        );
      }
      if (err instanceof InvalidBookingStatusTransitionError) {
        return NextResponse.json(
          { error: 'INVALID_TRANSITION', message: err.message },
          { status: 400 },
        );
      }
      const message = err instanceof Error ? err.message : 'Failed to start trip.';
      return NextResponse.json({ error: 'JOURNEY_ACTION_FAILED', message }, { status: 500 });
    }
  },
);
