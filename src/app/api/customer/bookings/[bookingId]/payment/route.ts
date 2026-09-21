import 'server-only';
import { NextResponse } from 'next/server';
import { withAuth } from '@/modules/identity/authorization/route-guard';
import {
  createPaymentForBooking,
  getPostTripPaymentForBooking,
} from '@/modules/finance/application/services/payment-service';

export const GET = withAuth(async (_req, _principal, routeContext?: unknown) => {
  try {
    const params = await (routeContext as { params: Promise<{ bookingId: string }> })?.params;
    const bookingId = params?.bookingId;
    if (!bookingId) {
      return NextResponse.json({ error: 'Missing booking ID' }, { status: 400 });
    }
    const payment = await getPostTripPaymentForBooking(bookingId);
    return NextResponse.json({ success: true, payment }, { status: 200 });
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : 'Failed to fetch customer payment details.';
    return NextResponse.json({ error: 'FETCH_CUSTOMER_PAYMENT_FAILED', message }, { status: 500 });
  }
});

export const POST = withAuth(async (req, { principal }, routeContext?: unknown) => {
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
    const message = err instanceof Error ? err.message : 'Failed to create customer payment.';
    return NextResponse.json({ error: 'CREATE_PAYMENT_FAILED', message }, { status: 500 });
  }
});
