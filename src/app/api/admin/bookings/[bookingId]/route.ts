import 'server-only';
import { NextResponse } from 'next/server';
import { withPermission } from '@/modules/identity/authorization/route-guard';
import { PERMISSIONS } from '@/modules/identity/domain/permission-catalog';
import { getDispatchBookingDetail } from '@/modules/booking/application/dispatch-service';

interface RouteParams {
  params: Promise<{ bookingId: string }>;
}

export const GET = withPermission<RouteParams>(
  PERMISSIONS.DISPATCH_BOOKING_READ,
  async (_req, _context, routeContext) => {
    const { bookingId } = await routeContext!.params;
    const booking = await getDispatchBookingDetail(bookingId);

    if (!booking) {
      return NextResponse.json(
        { error: { code: 'NOT_FOUND', message: 'Booking not found.' } },
        { status: 404 },
      );
    }

    return NextResponse.json({ booking }, { status: 200 });
  },
);
