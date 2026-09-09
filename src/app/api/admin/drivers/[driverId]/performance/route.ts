import 'server-only';
import { NextResponse } from 'next/server';
import { withPermission } from '@/modules/identity/authorization/route-guard';
import { PERMISSIONS } from '@/modules/identity/domain/permission-catalog';
import { getDriverPerformanceMetrics } from '@/modules/review/application/driver-performance-service';

type RouteParams = { params: Promise<{ driverId: string }> };

/**
 * Gated by ADMIN_DRIVER_READ (not DRIVER_PERFORMANCE_READ): the latter is
 * also granted to the DRIVER role for their own /api/driver/performance,
 * which takes no driverId parameter. Gating this admin-any-driver route by
 * that same permission would let any driver read another driver's
 * performance by supplying an arbitrary driverId.
 */
export const GET = withPermission<RouteParams>(
  PERMISSIONS.ADMIN_DRIVER_READ,
  async (_req, _ctx, routeContext) => {
    const { driverId } = await routeContext!.params;
    const performance = await getDriverPerformanceMetrics(driverId);
    return NextResponse.json({ performance }, { status: 200 });
  },
);
