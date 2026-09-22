import 'server-only';
import { NextResponse } from 'next/server';
import { withPermission } from '@/modules/identity/authorization/route-guard';
import { PERMISSIONS } from '@/modules/identity/domain/permission-catalog';
import {
  createScheduledRide,
  getCustomerScheduledRides,
} from '@/modules/scheduled-rides/application/scheduled-ride-service';
import { toErrorResponse } from '@/shared/errors/app-error';

export const GET = withPermission(PERMISSIONS.SCHEDULED_RIDES_READ, async (req, { principal }) => {
  const { searchParams } = new URL(req.url);
  const take = parseInt(searchParams.get('take') ?? '20', 10);
  const skip = parseInt(searchParams.get('skip') ?? '0', 10);

  const rides = await getCustomerScheduledRides(principal.userId, take, skip);
  return NextResponse.json({ success: true, data: rides }, { status: 200 });
});

export const POST = withPermission(
  PERMISSIONS.SCHEDULED_RIDES_CREATE,
  async (req, { principal }) => {
    try {
      const body = await req.json();
      const ride = await createScheduledRide(body, principal.userId);
      return NextResponse.json({ success: true, data: ride }, { status: 201 });
    } catch (err: unknown) {
      return toErrorResponse(err, req.nextUrl.pathname);
    }
  },
);
