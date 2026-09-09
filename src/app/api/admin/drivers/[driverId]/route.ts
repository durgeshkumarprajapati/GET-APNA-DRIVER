import 'server-only';
import { NextResponse } from 'next/server';
import { withPermission } from '@/modules/identity/authorization/route-guard';
import { PERMISSIONS } from '@/modules/identity/domain/permission-catalog';
import { getDriverProfileById } from '@/modules/driver/application/services/driver-profile-service';
import { evaluateDriverEligibility } from '@/modules/driver/application/services/driver-eligibility-service';

interface RouteParams {
  params: Promise<{ driverId: string }>;
}

export const GET = withPermission<RouteParams>(
  PERMISSIONS.ADMIN_DRIVER_READ,
  async (_req, _context, routeContext) => {
    const { driverId } = await routeContext!.params;
    const profile = await getDriverProfileById(driverId);
    const evaluation = await evaluateDriverEligibility(driverId);

    return NextResponse.json({ profile, evaluation }, { status: 200 });
  },
);
