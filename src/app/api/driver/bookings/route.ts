import { NextResponse } from 'next/server';
import { withPermission } from '@/modules/identity/authorization/route-guard';
import { PERMISSIONS } from '@/modules/identity/domain/permission-catalog';
import { listDriverBookings } from '@/modules/booking/application/driver-journey-service';
import { toErrorResponse } from '@/shared/errors/app-error';

export const GET = withPermission(
  PERMISSIONS.DRIVER_JOURNEY_MANAGE,
  async (_req, { principal }) => {
    try {
      const bookings = await listDriverBookings(principal.userId);
      return NextResponse.json({ bookings }, { status: 200 });
    } catch (err: unknown) {
      return toErrorResponse(err, _req.nextUrl.pathname);
    }
  },
);
