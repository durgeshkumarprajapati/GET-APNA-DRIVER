import 'server-only';
import { NextResponse } from 'next/server';
import { withPermission } from '@/modules/identity/authorization/route-guard';
import { PERMISSIONS } from '@/modules/identity/domain/permission-catalog';
import { activateDriverCoupon } from '@/modules/promotion/application/services/driver-coupon-service';

interface RouteParams {
  params: Promise<{ driverCouponId: string }>;
}

export const POST = withPermission<RouteParams>(
  PERMISSIONS.DRIVER_COUPONS_MANAGE,
  async (_req, { principal }, routeContext) => {
    const { driverCouponId } = await routeContext!.params;
    const coupon = await activateDriverCoupon(principal.userId, driverCouponId);
    return NextResponse.json({ coupon }, { status: 200 });
  },
);
