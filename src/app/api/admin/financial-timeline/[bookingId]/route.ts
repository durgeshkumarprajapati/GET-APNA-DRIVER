import 'server-only';
import { NextRequest, NextResponse } from 'next/server';
import { withRole } from '@/modules/identity/authorization/route-guard';
import { getFinancialTimelineForBooking } from '@/modules/billing/billing-service';
import { toErrorResponse } from '@/shared/errors/app-error';

export const GET = withRole('ADMIN', async (_req: NextRequest, _ctx, routeContext?: unknown) => {
  try {
    const { bookingId } = (routeContext as { params: Promise<{ bookingId: string }> })?.params
      ? await (routeContext as { params: Promise<{ bookingId: string }> }).params
      : { bookingId: '' };

    if (!bookingId) {
      return NextResponse.json(
        { error: 'MISSING_BOOKING_ID', message: 'Booking ID is required' },
        { status: 400 },
      );
    }

    const timelineData = await getFinancialTimelineForBooking(bookingId);

    return NextResponse.json({
      success: true,
      ...timelineData,
    });
  } catch (err: unknown) {
    return toErrorResponse(err, _req.nextUrl.pathname);
  }
});
