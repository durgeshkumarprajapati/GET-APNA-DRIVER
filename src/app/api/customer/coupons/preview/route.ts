import 'server-only';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { withAuth } from '@/modules/identity/authorization/route-guard';
import { previewCouponSavings } from '@/modules/loyalty/application/offers-rewards-center-service';

const previewSchema = z.object({
  code: z.string().min(1),
  estimatedFare: z.number().positive(),
});

export const POST = withAuth(async (req) => {
  const body = await req.json();
  const parsed = previewSchema.parse(body);

  const preview = await previewCouponSavings(parsed.code, parsed.estimatedFare);
  return NextResponse.json({ preview }, { status: 200 });
});
