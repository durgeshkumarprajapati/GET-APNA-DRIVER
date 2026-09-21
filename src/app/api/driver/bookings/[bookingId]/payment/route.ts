import 'server-only';
import { NextResponse } from 'next/server';
import { withAuth } from '@/modules/identity/authorization/route-guard';
import { getOrCreateDriverProfile } from '@/modules/driver/application/services/driver-profile-service';
import { getPostTripPaymentForBooking } from '@/modules/finance/application/services/payment-service';

export const GET = withAuth(async (_req, { principal }, routeContext?: unknown) => {
  try {
    const params = await (routeContext as { params: Promise<{ bookingId: string }> })?.params;
    const bookingId = params?.bookingId;
    if (!bookingId) {
      return NextResponse.json({ error: 'Missing booking ID' }, { status: 400 });
    }
    const profile = await getOrCreateDriverProfile(principal.userId);
    const payment = await getPostTripPaymentForBooking(bookingId, { driverProfileId: profile.id });
    return NextResponse.json({ success: true, payment }, { status: 200 });
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : 'Failed to fetch driver post-trip payment status.';
    return NextResponse.json({ error: 'FETCH_DRIVER_PAYMENT_FAILED', message }, { status: 500 });
  }
});
