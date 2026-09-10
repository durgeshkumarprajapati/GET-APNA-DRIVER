import 'server-only';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { PromotionDiscountType } from '@prisma/client';
import { withPermission } from '@/modules/identity/authorization/route-guard';
import { PERMISSIONS } from '@/modules/identity/domain/permission-catalog';
import {
  getPromotionById,
  updatePromotion,
} from '@/modules/promotion/application/services/promotion-service';

interface RouteParams {
  params: Promise<{ promotionId: string }>;
}

const promotionConfigSchema = z.object({
  code: z.string().trim().min(1).max(50).nullable().optional(),
  name: z.string().trim().min(1).max(200),
  description: z.string().trim().max(1000).nullable().optional(),
  discountType: z.enum(PromotionDiscountType),
  discountValue: z.string().trim().min(1),
  maxDiscountAmount: z.string().trim().min(1).nullable().optional(),
  minBookingValue: z.string().trim().min(1).nullable().optional(),
  firstRideOnly: z.boolean().optional(),
  isAutomatic: z.boolean().optional(),
  startsAt: z.string().datetime(),
  endsAt: z.string().datetime().nullable().optional(),
  totalUsageLimit: z.number().int().min(1).nullable().optional(),
  perUserUsageLimit: z.number().int().min(1).nullable().optional(),
});

export const GET = withPermission<RouteParams>(
  PERMISSIONS.PROMOTIONS_MANAGE,
  async (_req, _context, routeContext) => {
    const { promotionId } = await routeContext!.params;
    const promotion = await getPromotionById(promotionId);
    return NextResponse.json({ promotion }, { status: 200 });
  },
);

export const PATCH = withPermission<RouteParams>(
  PERMISSIONS.PROMOTIONS_MANAGE,
  async (req, { principal }, routeContext) => {
    const { promotionId } = await routeContext!.params;
    const body = await req.json();

    let parsed: z.infer<typeof promotionConfigSchema>;
    try {
      parsed = promotionConfigSchema.parse(body);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return NextResponse.json(
          { error: 'INVALID_INPUT', message: error.issues[0]?.message ?? 'Invalid input' },
          { status: 400 },
        );
      }
      throw error;
    }

    const promotion = await updatePromotion(principal.userId, promotionId, parsed);
    return NextResponse.json({ promotion }, { status: 200 });
  },
);
