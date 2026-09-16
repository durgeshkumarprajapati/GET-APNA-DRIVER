import { NextResponse } from 'next/server';
import { withPermission } from '@/modules/identity/authorization/route-guard';
import { PERMISSIONS } from '@/modules/identity/domain/permission-catalog';
import { getDriverBookingLocationTelemetry } from '@/modules/location/application/booking-location-service';
import { BookingNotFoundError } from '@/modules/booking/domain/errors';

type RouteParams = { params: Promise<{ bookingId: string }> };

export const GET = withPermission<RouteParams>(
  PERMISSIONS.BOOKINGS_READ,
  async (_req, { principal }, routeContext) => {
    try {
      const { bookingId } = await routeContext!.params;
      const telemetry = await getDriverBookingLocationTelemetry(principal.userId, bookingId);
      return NextResponse.json({ telemetry }, { status: 200 });
    } catch (err: unknown) {
      if (err instanceof BookingNotFoundError) {
        return NextResponse.json(
          { error: 'BOOKING_NOT_FOUND', message: err.message },
          { status: 404 },
        );
      }
      const message =
        err instanceof Error ? err.message : 'Failed to fetch driver booking location.';
      return NextResponse.json({ error: 'LOCATION_FETCH_FAILED', message }, { status: 500 });
    }
  },
);
