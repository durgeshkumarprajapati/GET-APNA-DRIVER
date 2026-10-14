import 'server-only';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { withPermission } from '@/modules/identity/authorization/route-guard';
import { PERMISSIONS } from '@/modules/identity/domain/permission-catalog';
import { updateDriverRatesByAdmin } from '@/modules/driver/application/services/driver-profile-service';

const updateRatesSchema = z.object({
  dailyHireRate: z.number().nonnegative().nullable().optional(),
  weeklyHireRate: z.number().nonnegative().nullable().optional(),
  monthlyHireRate: z.number().nonnegative().nullable().optional(),
});

interface RouteParams {
  params: Promise<{ driverId: string }>;
}

export const PUT = withPermission<RouteParams>(
  PERMISSIONS.ADMIN_DRIVER_RATE_MANAGE,
  async (req, { principal }, routeContext) => {
    const { driverId } = await routeContext!.params;
    const body = await req.json();
    const parsed = updateRatesSchema.parse(body);

    const profile = await updateDriverRatesByAdmin(principal.userId, driverId, parsed, {
      ipAddress: req.headers.get('x-forwarded-for'),
    });

    return NextResponse.json({ profile }, { status: 200 });
  },
);
