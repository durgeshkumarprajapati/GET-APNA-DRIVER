import 'server-only';
import { NextResponse } from 'next/server';
import { withAuth } from '@/modules/identity/authorization/route-guard';
import { getOrCreateDriverProfile } from '@/modules/driver/application/services/driver-profile-service';
import { confirmCashPaymentByDriver } from '@/modules/finance/application/services/payment-service';

export const POST = withAuth(async (_req, { principal }, routeContext?: unknown) => {
  try {
    const params = await (routeContext as { params: Promise<{ bookingId: string }> })?.params;
    const bookingId = params?.bookingId;
    if (!bookingId) {
      return NextResponse.json({ error: 'Missing booking ID' }, { status: 400 });
    }
    const profile = await getOrCreateDriverProfile(principal.userId);
    const payment = await confirmCashPaymentByDriver(profile.id, bookingId);
    return NextResponse.json({ success: true, payment }, { status: 200 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed driver cash payment confirmation.';
    return NextResponse.json(
      { error: 'DRIVER_CASH_CONFIRMATION_FAILED', message },
      { status: 500 },
    );
  }
});
