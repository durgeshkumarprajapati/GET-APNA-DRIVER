import 'server-only';
import { NextResponse } from 'next/server';
import { withPermission } from '@/modules/identity/authorization/route-guard';
import { PERMISSIONS } from '@/modules/identity/domain/permission-catalog';
import { markMessagesAsRead } from '@/modules/booking/application/booking-messaging-service';
import { AppError, toErrorResponse } from '@/shared/errors/app-error';
import { BookingNotFoundError } from '@/modules/booking/domain/errors';

type RouteParams = { params: Promise<{ bookingId: string }> };

export const POST = withPermission<RouteParams>(
  PERMISSIONS.MESSAGE_DRIVER_SEND,
  async (_req, { principal }, routeContext) => {
    try {
      const { bookingId } = await routeContext!.params;
      const result = await markMessagesAsRead(principal.userId, bookingId);
      return NextResponse.json(result, { status: 200 });
    } catch (err: unknown) {
      if (err instanceof BookingNotFoundError) {
        return NextResponse.json(
          { error: 'BOOKING_NOT_FOUND', message: err.message },
          { status: 404 },
        );
      }
      if (err instanceof AppError) {
        return NextResponse.json(
          { error: err.code, message: err.message },
          { status: err.statusCode },
        );
      }
      return toErrorResponse(err, _req.nextUrl.pathname);
    }
  },
);
