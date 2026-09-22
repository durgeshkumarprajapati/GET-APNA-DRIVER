import { NextResponse } from 'next/server';
import { z } from 'zod';
import { withPermission } from '@/modules/identity/authorization/route-guard';
import { PERMISSIONS } from '@/modules/identity/domain/permission-catalog';
import { cancelBookingByDriver } from '@/modules/booking/application/driver-journey-service';
import {
  BookingNotFoundError,
  BookingNotCancellableError,
  InvalidBookingStatusTransitionError,
} from '@/modules/booking/domain/errors';

type RouteParams = { params: Promise<{ bookingId: string }> };

const cancelBookingSchema = z.object({
  reason: z.string().trim().min(1).max(500).optional(),
});

export const POST = withPermission<RouteParams>(
  PERMISSIONS.DRIVER_JOURNEY_MANAGE,
  async (req, { principal }, routeContext) => {
    try {
      const { bookingId } = await routeContext!.params;
      let reason: string | undefined;
      try {
        const body = await req.json();
        reason = cancelBookingSchema.parse(body).reason;
      } catch (parseErr) {
        if (parseErr instanceof z.ZodError) {
          return NextResponse.json(
            {
              error: 'INVALID_INPUT',
              message: 'Invalid cancellation reason.',
              issues: parseErr.issues,
            },
            { status: 400 },
          );
        }
        // Body optional / not JSON — proceed with no reason.
      }

      const booking = await cancelBookingByDriver(principal.userId, bookingId, reason);
      return NextResponse.json(
        { booking, message: 'Trip cancelled. The customer has been notified.' },
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
      if (err instanceof InvalidBookingStatusTransitionError) {
        return NextResponse.json(
          { error: 'INVALID_TRANSITION', message: err.message },
          { status: 400 },
        );
      }
      const message = err instanceof Error ? err.message : 'Failed to cancel trip.';
      return NextResponse.json({ error: 'CANCELLATION_FAILED', message }, { status: 500 });
    }
  },
);
