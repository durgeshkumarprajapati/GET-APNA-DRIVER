import 'server-only';
import { NextResponse } from 'next/server';
import { withPermission } from '@/modules/identity/authorization/route-guard';
import { PERMISSIONS } from '@/modules/identity/domain/permission-catalog';
import { approveDriver } from '@/modules/driver/application/services/driver-onboarding-service';

interface RouteParams {
  params: Promise<{ driverId: string }>;
}

export const POST = withPermission<RouteParams>(
  PERMISSIONS.ADMIN_DRIVER_APPROVE,
  async (req, { principal }, routeContext) => {
    const { driverId } = await routeContext!.params;

    const profile = await approveDriver(principal.userId, driverId, {
      ipAddress: req.headers.get('x-forwarded-for'),
    });

    return NextResponse.json({ profile }, { status: 200 });
  },
);
