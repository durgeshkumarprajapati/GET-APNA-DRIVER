import 'server-only';
import { NextResponse } from 'next/server';
import { withPermission } from '@/modules/identity/authorization/route-guard';
import { PERMISSIONS } from '@/modules/identity/domain/permission-catalog';
import { getJourneyDetails } from '@/modules/trip-execution/application/journey-orchestration-service';
import { toErrorResponse } from '@/shared/errors/app-error';

type RouteParams = { params: Promise<{ bookingId: string }> };

export const GET = withPermission<RouteParams>(
  PERMISSIONS.ADMIN_OPERATIONS_READ,
  async (req, { principal }, routeContext) => {
    try {
      const { bookingId } = await routeContext!.params;
      const result = await getJourneyDetails(bookingId, 'ADMIN', principal.userId);

      return NextResponse.json({ journey: result.admin }, { status: 200 });
    } catch (err: unknown) {
      if (err instanceof Error && err.message.includes('not found')) {
        return NextResponse.json(
          { error: 'BOOKING_NOT_FOUND', message: 'Booking not found.' },
          { status: 404 },
        );
      }
      return toErrorResponse(err, req.nextUrl.pathname);
    }
  },
);
