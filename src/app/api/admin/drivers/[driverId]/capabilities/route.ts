import 'server-only';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { withPermission } from '@/modules/identity/authorization/route-guard';
import { PERMISSIONS } from '@/modules/identity/domain/permission-catalog';
import {
  getDriverVehicleCapabilities,
  setDriverVehicleCapabilities,
} from '@/modules/driver/application/services/driver-capability-service';

type RouteParams = { params: Promise<{ driverId: string }> };

const updateCapabilitiesSchema = z.object({
  categoryIds: z.array(z.string()),
});

export const GET = withPermission<RouteParams>(
  PERMISSIONS.ADMIN_DRIVER_READ,
  async (_req: NextRequest, _ctx, routeContext) => {
    const { driverId } = await routeContext!.params;
    if (!driverId) {
      return NextResponse.json({ error: 'Driver ID is required' }, { status: 400 });
    }

    const capabilities = await getDriverVehicleCapabilities(driverId);
    return NextResponse.json({ capabilities }, { status: 200 });
  },
);

export const PUT = withPermission<RouteParams>(
  PERMISSIONS.ADMIN_DRIVER_APPROVE,
  async (req: NextRequest, { principal }, routeContext) => {
    const { driverId } = await routeContext!.params;
    if (!driverId) {
      return NextResponse.json({ error: 'Driver ID is required' }, { status: 400 });
    }

    const body = await req.json();
    const parsed = updateCapabilitiesSchema.parse(body);

    const updated = await setDriverVehicleCapabilities(
      driverId,
      parsed.categoryIds,
      principal.userId,
    );

    return NextResponse.json({ capabilities: updated }, { status: 200 });
  },
);
