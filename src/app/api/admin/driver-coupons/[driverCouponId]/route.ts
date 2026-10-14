import 'server-only';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { withPermission } from '@/modules/identity/authorization/route-guard';
import { PERMISSIONS } from '@/modules/identity/domain/permission-catalog';
import {
  getDriverCouponById,
  updateDriverCoupon,
} from '@/modules/promotion/application/services/driver-coupon-service';

interface RouteParams {
  params: Promise<{ driverCouponId: string }>;
}

const driverCouponConfigSchema = z.object({
  code: z.string().trim().min(1).max(50),
  name: z.string().trim().min(1).max(200),
  description: z.string().trim().max(1000).nullable().optional(),
  creditAmount: z.string().trim().min(1),
  startsAt: z.string().datetime(),
  endsAt: z.string().datetime().nullable().optional(),
  totalUsageLimit: z.number().int().min(1).nullable().optional(),
});

export const GET = withPermission<RouteParams>(
  PERMISSIONS.DRIVER_COUPONS_MANAGE,
  async (_req, _context, routeContext) => {
    const { driverCouponId } = await routeContext!.params;
    const coupon = await getDriverCouponById(driverCouponId);
    return NextResponse.json({ coupon }, { status: 200 });
  },
);

export const PATCH = withPermission<RouteParams>(
  PERMISSIONS.DRIVER_COUPONS_MANAGE,
  async (req, { principal }, routeContext) => {
    const { driverCouponId } = await routeContext!.params;
    const body = await req.json();

    let parsed: z.infer<typeof driverCouponConfigSchema>;
    try {
      parsed = driverCouponConfigSchema.parse(body);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return NextResponse.json(
          { error: 'INVALID_INPUT', message: error.issues[0]?.message ?? 'Invalid input' },
          { status: 400 },
        );
      }
      throw error;
    }

    const coupon = await updateDriverCoupon(principal.userId, driverCouponId, parsed);
    return NextResponse.json({ coupon }, { status: 200 });
  },
);
