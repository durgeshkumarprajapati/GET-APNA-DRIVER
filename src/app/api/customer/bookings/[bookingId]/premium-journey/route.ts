import 'server-only';
import { NextResponse } from 'next/server';
import { withPermission } from '@/modules/identity/authorization/route-guard';
import { PERMISSIONS } from '@/modules/identity/domain/permission-catalog';
import { getPremiumJourneyTrustDetails } from '@/modules/customer/application/premium-journey-service';

export const GET = withPermission(
  PERMISSIONS.BOOKINGS_READ,
  async (_req, { principal }, routeContext) => {
    const params = await (routeContext as { params: Promise<{ bookingId: string }> }).params;
    const bookingId = params.bookingId;

    const details = await getPremiumJourneyTrustDetails(bookingId, principal.userId);
    return NextResponse.json(details, { status: 200 });
  },
);
