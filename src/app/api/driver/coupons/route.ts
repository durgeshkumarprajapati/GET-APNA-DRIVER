import 'server-only';
import { NextResponse } from 'next/server';
import { withPermission } from '@/modules/identity/authorization/route-guard';
import { PERMISSIONS } from '@/modules/identity/domain/permission-catalog';
import { listActiveDriverCouponsForDriver } from '@/modules/promotion/application/services/driver-coupon-service';

export const GET = withPermission(
  PERMISSIONS.DRIVER_COUPONS_REDEEM,
  async (_req, { principal }) => {
    const coupons = await listActiveDriverCouponsForDriver(principal.userId);
    return NextResponse.json({ coupons }, { status: 200 });
  },
);
