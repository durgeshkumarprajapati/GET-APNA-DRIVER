import 'server-only';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { withPermission } from '@/modules/identity/authorization/route-guard';
import { PERMISSIONS } from '@/modules/identity/domain/permission-catalog';
import { forceAssignDriver } from '@/modules/booking/application/dispatch-service';
import {
  BookingNotFoundError,
  DispatchInvalidBookingStateError,
  DriverNotAvailableForDispatchError,
  DriverNotEligibleForDispatchError,
} from '@/modules/booking/domain/errors';
import { toErrorResponse } from '@/shared/errors/app-error';

const forceAssignSchema = z.object({
  driverProfileId: z.string().uuid(),
  reason: z.string().min(1),
  bypassEligibility: z.boolean().optional(),
});

interface RouteParams {
  params: Promise<{ bookingId: string }>;
}

export const POST = withPermission<RouteParams>(
  PERMISSIONS.DISPATCH_ASSIGNMENT_FORCE,
  async (req, { principal }, routeContext) => {
    const { bookingId } = await routeContext!.params;

    try {
      const body = await req.json();
      const parsed = forceAssignSchema.parse(body);

      const booking = await forceAssignDriver({
        bookingId,
        driverProfileId: parsed.driverProfileId,
        actor: principal,
        reason: parsed.reason,
        bypassEligibility: parsed.bypassEligibility,
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
      if (
        err instanceof DriverNotEligibleForDispatchError ||
        err instanceof DriverNotAvailableForDispatchError
      ) {
        return NextResponse.json(
          { error: 'DRIVER_NOT_ASSIGNABLE', message: err.message },
          { status: 409 },
        );
      }
      return toErrorResponse(err, req.nextUrl.pathname);
    }
  },
);
