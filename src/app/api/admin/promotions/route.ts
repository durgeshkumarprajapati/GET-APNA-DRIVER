import 'server-only';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { PromotionDiscountType, PromotionStatus } from '@prisma/client';
import { withPermission } from '@/modules/identity/authorization/route-guard';
import { PERMISSIONS } from '@/modules/identity/domain/permission-catalog';
import {
  createPromotion,
  listPromotions,
} from '@/modules/promotion/application/services/promotion-service';

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

export const GET = withPermission(PERMISSIONS.PROMOTIONS_MANAGE, async (req) => {
  const { searchParams } = new URL(req.url);
  const statusParam = searchParams.get('status');
  const status =
    statusParam && statusParam in PromotionStatus ? (statusParam as PromotionStatus) : undefined;
  const search = searchParams.get('search') ?? undefined;
  const page = Number(searchParams.get('page') ?? '1');
  const pageSize = Number(searchParams.get('pageSize') ?? '25');

  const result = await listPromotions({
    ...(status ? { status } : {}),
    ...(search ? { search } : {}),
    page: Number.isFinite(page) && page > 0 ? page : 1,
    pageSize: Number.isFinite(pageSize) && pageSize > 0 ? pageSize : 25,
  });
  return NextResponse.json(result, { status: 200 });
});

export const POST = withPermission(PERMISSIONS.PROMOTIONS_MANAGE, async (req, { principal }) => {
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

  const promotion = await createPromotion(principal.userId, parsed);
  return NextResponse.json({ promotion }, { status: 201 });
});
