import 'server-only';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { withPermission } from '@/modules/identity/authorization/route-guard';
import { PERMISSIONS } from '@/modules/identity/domain/permission-catalog';
import { cancelBookingByOperator } from '@/modules/booking/application/dispatch-service';
import {
  BookingNotFoundError,
  DispatchInvalidBookingStateError,
} from '@/modules/booking/domain/errors';
import { toErrorResponse } from '@/shared/errors/app-error';

const cancelSchema = z.object({
  reason: z.string().min(1),
});

interface RouteParams {
  params: Promise<{ bookingId: string }>;
}

export const POST = withPermission<RouteParams>(
  PERMISSIONS.BOOKINGS_CANCEL,
  async (req, { principal }, routeContext) => {
    const { bookingId } = await routeContext!.params;

    try {
      const body = await req.json();
      const parsed = cancelSchema.parse(body);

      const booking = await cancelBookingByOperator({
        bookingId,
        actor: principal,
        reason: parsed.reason,
      });

      return NextResponse.json({ booking }, { status: 200 });
    } catch (err: unknown) {
      if (err instanceof BookingNotFoundError) {
        return NextResponse.json(
          { error: 'BOOKING_NOT_FOUND', message: err.message },
          { status: 404 },
        );
      }
      if (err instanceof DispatchInvalidBookingStateError) {
        return NextResponse.json(
          { error: 'INVALID_BOOKING_STATE', message: err.message },
          { status: 409 },
        );
      }
      return toErrorResponse(err, req.nextUrl.pathname);
    }
  },
);
