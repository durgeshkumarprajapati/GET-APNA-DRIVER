import 'server-only';
import { NextResponse } from 'next/server';
import { withAuth } from '@/modules/identity/authorization/route-guard';
import { prisma } from '@/shared/database/prisma';
import {
  getDispatchSearchState,
  CUSTOMER_CANCELLATION_TEXT,
  CANCELLATION_REASON_NO_DRIVER,
} from '@/modules/dispatch/application/dispatch-search-service';
import { toErrorResponse } from '@/shared/errors/app-error';

export const GET = withAuth(async (req, { principal }, routeContext?: unknown) => {
  try {
    const params = await (routeContext as { params: Promise<{ bookingId: string }> })?.params;
    const bookingId = params?.bookingId;

    if (!bookingId) {
      return NextResponse.json({ error: 'Missing booking ID' }, { status: 400 });
    }

    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      select: {
        id: true,
        customerId: true,
        status: true,
        cancellationReason: true,
        cancelledAt: true,
      },
    });

    if (!booking) {
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
    }

    if (booking.customerId !== principal.userId) {
      return NextResponse.json({ error: 'Unauthorized access to booking dispatch status' }, { status: 403 });
    }

    const searchState = await getDispatchSearchState(bookingId);

    const isNoDriverCancelled =
      booking.status === 'CANCELLED' && booking.cancellationReason === CANCELLATION_REASON_NO_DRIVER;

    return NextResponse.json({
      dispatchStatus: {
        bookingId: booking.id,
        status: booking.status,
        searchStartedAt: searchState?.searchStartedAt.toISOString() || null,
        searchDeadlineAt: searchState?.searchDeadlineAt.toISOString() || null,
        remainingSeconds: searchState?.remainingSeconds ?? 0,
        hasExpired: searchState?.hasExpired ?? false,
        isNoDriverCancelled,
        cancellationReason: booking.cancellationReason,
        cancellationMessage: isNoDriverCancelled ? CUSTOMER_CANCELLATION_TEXT : null,
      },
    });
  } catch (error: unknown) {
    return toErrorResponse(error, req.nextUrl.pathname);
  }
});
