import 'server-only';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { BookingType } from '@prisma/client';
import { withPermission } from '@/modules/identity/authorization/route-guard';
import { PERMISSIONS } from '@/modules/identity/domain/permission-catalog';
import { simulateDynamicPricing } from '@/modules/dynamic-pricing/application/dynamic-pricing-service';

const simulateSchema = z.object({
  zoneId: z.string().optional(),
  bookingType: z.nativeEnum(BookingType),
  baseFareAmount: z.number().positive(),
  simulatedSupply: z.number().nonnegative(),
  simulatedDemand: z.number().nonnegative(),
});

export const POST = withPermission(PERMISSIONS.ADMIN_PRICING_MANAGE, async (req) => {
  const body = await req.json();
  const parsed = simulateSchema.parse(body);

  const simulation = await simulateDynamicPricing(parsed);

  return NextResponse.json({ simulation }, { status: 200 });
});
