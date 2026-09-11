import { NextResponse } from 'next/server';
import { z } from 'zod';
import { withPermission } from '@/modules/identity/authorization/route-guard';
import { PERMISSIONS } from '@/modules/identity/domain/permission-catalog';
import { startTrip } from '@/modules/booking/application/driver-journey-service';
import { CustomerPinNotSetError } from '@/modules/customer/application/services/ride-pin-service';
import {
  BookingNotFoundError,
  InvalidBookingStatusTransitionError,
  InvalidRidePinError,
  MaxRidePinAttemptsExceededError,
} from '@/modules/booking/domain/errors';

type RouteParams = { params: Promise<{ bookingId: string }> };

const startTripSchema = z.object({
  ridePin: z.string().regex(/^\d{6}$/, 'Ride PIN must be a 6-digit numeric code'),
});

export const POST = withPermission<RouteParams>(
  PERMISSIONS.DRIVER_JOURNEY_MANAGE,
  async (req, { principal }, routeContext) => {
    try {
      const { bookingId } = await routeContext!.params;
      const body = await req.json().catch(() => ({}));
      const parsed = startTripSchema.parse(body);

      const booking = await startTrip(principal.userId, bookingId, parsed.ridePin);
      return NextResponse.json(
        { booking, message: 'Ride PIN verified. Trip is now in progress.' },
        { status: 200 },
      );
    } catch (err: unknown) {
      if (err instanceof z.ZodError) {
        return NextResponse.json(
          { error: 'INVALID_RIDE_PIN', message: 'Please enter a valid 6-digit Customer Ride PIN.' },
          { status: 400 },
        );
      }
      if (err instanceof InvalidRidePinError) {
        return NextResponse.json(
          { error: 'INVALID_RIDE_PIN', message: 'Invalid ride PIN.' },
          { status: 400 },
        );
      }
      if (err instanceof MaxRidePinAttemptsExceededError) {
        return NextResponse.json(
          { error: 'MAX_ATTEMPTS_EXCEEDED', message: err.message },
          { status: 429 },
        );
      }
      if (err instanceof CustomerPinNotSetError) {
        return NextResponse.json(
          {
            error: 'CUSTOMER_PIN_NOT_SET',
            message: 'Customer has not configured their 6-digit Ride PIN yet.',
          },
          { status: 400 },
        );
      }
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
