import 'server-only';
import { NextResponse } from 'next/server';
import { withPermission } from '@/modules/identity/authorization/route-guard';
import { PERMISSIONS } from '@/modules/identity/domain/permission-catalog';
import { toErrorResponse } from '@/shared/errors/app-error';
import { getOrCreateDriverProfile } from '@/modules/driver/application/services/driver-profile-service';
import { confirmCashPaymentByDriver } from '@/modules/finance/application/services/payment-service';

export const POST = withPermission(
  PERMISSIONS.PAYMENTS_READ,
  async (req, { principal }, routeContext?: unknown) => {
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
      return toErrorResponse(err, req.nextUrl.pathname);
    }
  },
);
