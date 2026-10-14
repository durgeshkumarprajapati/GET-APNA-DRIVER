import 'server-only';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { withPermission } from '@/modules/identity/authorization/route-guard';
import { PERMISSIONS } from '@/modules/identity/domain/permission-catalog';
import { redeemDriverCoupon } from '@/modules/promotion/application/services/driver-coupon-service';

const redeemCouponSchema = z.object({
  code: z.string().trim().min(1).max(50),
});

export const POST = withPermission(
  PERMISSIONS.DRIVER_COUPONS_REDEEM,
  async (req, { principal }) => {
    const body = await req.json();

    let parsed: z.infer<typeof redeemCouponSchema>;
    try {
      parsed = redeemCouponSchema.parse(body);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return NextResponse.json(
          { error: 'INVALID_INPUT', message: error.issues[0]?.message ?? 'Invalid input' },
          { status: 400 },
        );
      }
      throw error;
    }

    const redemption = await redeemDriverCoupon(principal.userId, parsed.code);
    return NextResponse.json({ redemption }, { status: 201 });
  },
);
