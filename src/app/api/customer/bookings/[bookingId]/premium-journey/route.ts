import 'server-only';
import { NextResponse, type NextRequest } from 'next/server';
import { withPermission } from '@/modules/identity/authorization/route-guard';
import { PERMISSIONS } from '@/modules/identity/domain/permission-catalog';
import { getPremiumJourneyTrustDetails } from '@/modules/customer/application/premium-journey-service';
import { toErrorResponse } from '@/shared/errors/app-error';

type RouteParams = { params: Promise<{ bookingId: string }> };

export const GET = withPermission<RouteParams>(
  PERMISSIONS.BOOKINGS_READ,
  async (req: NextRequest, { principal }, routeContext) => {
    try {
      const { bookingId } = await routeContext!.params;
      const details = await getPremiumJourneyTrustDetails(bookingId, principal.userId);
      return NextResponse.json(details, { status: 200 });
    } catch (err: unknown) {
      return toErrorResponse(err, req.nextUrl.pathname);
    }
  },
);
