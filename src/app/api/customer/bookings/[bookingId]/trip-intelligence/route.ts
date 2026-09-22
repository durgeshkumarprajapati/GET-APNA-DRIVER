import { NextResponse } from 'next/server';
import { withPermission } from '@/modules/identity/authorization/route-guard';
import { PERMISSIONS } from '@/modules/identity/domain/permission-catalog';
import { TripIntelligenceService } from '@/modules/trip-intelligence/trip-intelligence-service';
import { toErrorResponse } from '@/shared/errors/app-error';

type RouteParams = { params: Promise<{ bookingId: string }> };

const service = new TripIntelligenceService();

export const GET = withPermission<RouteParams>(
  PERMISSIONS.BOOKINGS_READ,
  async (_req, { principal }, routeContext) => {
    try {
      const { bookingId } = await routeContext!.params;
      const intelligence = await service.getTripIntelligence(
        principal.userId,
        bookingId,
        'CUSTOMER',
      );

      if (!intelligence) {
        return NextResponse.json({ error: 'INTELLIGENCE_UNAVAILABLE' }, { status: 404 });
      }

      return NextResponse.json({ intelligence }, { status: 200 });
    } catch (err: unknown) {
      return toErrorResponse(err, _req.nextUrl.pathname);
    }
  },
);
