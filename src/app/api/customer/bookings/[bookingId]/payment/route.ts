import 'server-only';
import { NextResponse } from 'next/server';
import { withPermission } from '@/modules/identity/authorization/route-guard';
import { PERMISSIONS } from '@/modules/identity/domain/permission-catalog';
import { toErrorResponse } from '@/shared/errors/app-error';
import {
  createPaymentForBooking,
  getPostTripPaymentForBooking,
} from '@/modules/finance/application/services/payment-service';

export const GET = withPermission(
  PERMISSIONS.PAYMENTS_READ,
  async (req, { principal }, routeContext?: unknown) => {
    try {
      const params = await (routeContext as { params: Promise<{ bookingId: string }> })?.params;
      const bookingId = params?.bookingId;
      if (!bookingId) {
        return NextResponse.json({ error: 'Missing booking ID' }, { status: 400 });
      }
      const payment = await getPostTripPaymentForBooking(bookingId, { userId: principal.userId });
      return NextResponse.json({ success: true, payment }, { status: 200 });
    } catch (err: unknown) {
      return toErrorResponse(err, req.nextUrl.pathname);
    }
  },
);

export const POST = withPermission(
  PERMISSIONS.PAYMENTS_CREATE,
  async (req, { principal }, routeContext?: unknown) => {
    try {
      const params = await (routeContext as { params: Promise<{ bookingId: string }> })?.params;
      const bookingId = params?.bookingId;
      if (!bookingId) {
        return NextResponse.json({ error: 'Missing booking ID' }, { status: 400 });
      }
      const body = (await req.json().catch(() => ({}))) as {
        paymentMethod?: string;
        idempotencyKey?: string;
      };

      const checkout = await createPaymentForBooking(principal.userId, {
        bookingId,
        paymentMethod: body.paymentMethod ?? 'ONLINE',
        idempotencyKey: body.idempotencyKey ?? null,
      });

      return NextResponse.json({ success: true, checkout }, { status: 200 });
    } catch (err: unknown) {
      return toErrorResponse(err, req.nextUrl.pathname);
    }
  },
);
