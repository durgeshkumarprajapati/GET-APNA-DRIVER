import 'server-only';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { withPermission } from '@/modules/identity/authorization/route-guard';
import { PERMISSIONS } from '@/modules/identity/domain/permission-catalog';
import { validateCouponForPreview } from '@/modules/promotion/application/services/promotion-eligibility-service';
import { toErrorResponse } from '@/shared/errors/app-error';

const validateCouponSchema = z.object({
  code: z.string().trim().min(1, 'Coupon code is required').max(50),
  fareAmount: z.string().trim().min(1, 'Fare amount is required'),
  bookingType: z.string().optional(),
});

export const POST = withPermission(PERMISSIONS.PROMOTIONS_READ, async (req, { principal }) => {
  try {
    const body = await req.json().catch(() => ({}));
    const parsed = validateCouponSchema.parse(body);

    const result = await validateCouponForPreview({
      code: parsed.code,
      fareAmount: parsed.fareAmount,
      bookingType: parsed.bookingType,
      userId: principal.userId,
    });

    return NextResponse.json({ preview: result }, { status: 200 });
  } catch (err: unknown) {
    if (err instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'INVALID_COUPON_INPUT', issues: err.issues },
        { status: 400 },
      );
    }
    return toErrorResponse(err, req.nextUrl.pathname);
  }
});
