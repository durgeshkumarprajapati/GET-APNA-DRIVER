import 'server-only';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { withPermission } from '@/modules/identity/authorization/route-guard';
import { PERMISSIONS } from '@/modules/identity/domain/permission-catalog';
import { requestChanges } from '@/modules/driver/application/services/driver-onboarding-service';

const requestChangesSchema = z.object({
  reason: z.string().min(1),
});

interface RouteParams {
  params: Promise<{ driverId: string }>;
}

export const POST = withPermission<RouteParams>(
  PERMISSIONS.ADMIN_DRIVER_REVIEW,
  async (req, { principal }, routeContext) => {
    const { driverId } = await routeContext!.params;
    const body = await req.json();
    const parsed = requestChangesSchema.parse(body);

    const profile = await requestChanges(principal.userId, driverId, parsed.reason, {
      ipAddress: req.headers.get('x-forwarded-for'),
    });

    return NextResponse.json({ profile }, { status: 200 });
  },
);
