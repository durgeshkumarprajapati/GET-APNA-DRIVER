import 'server-only';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { withPermission } from '@/modules/identity/authorization/route-guard';
import { PERMISSIONS } from '@/modules/identity/domain/permission-catalog';
import { rejectDriver } from '@/modules/driver/application/services/driver-onboarding-service';

const rejectSchema = z.object({
  reason: z.string().min(1),
});

interface RouteParams {
  params: Promise<{ driverId: string }>;
}

export const POST = withPermission<RouteParams>(
  PERMISSIONS.ADMIN_DRIVER_APPROVE,
  async (req, { principal }, routeContext) => {
    const { driverId } = await routeContext!.params;
    const body = await req.json();
    const parsed = rejectSchema.parse(body);

    const profile = await rejectDriver(principal.userId, driverId, parsed.reason, {
      ipAddress: req.headers.get('x-forwarded-for'),
    });

    return NextResponse.json({ profile }, { status: 200 });
  },
);
