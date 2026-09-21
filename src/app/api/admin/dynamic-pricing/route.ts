import 'server-only';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { BookingType } from '@prisma/client';
import { prisma } from '@/shared/database/prisma';
import { withPermission } from '@/modules/identity/authorization/route-guard';
import { PERMISSIONS } from '@/modules/identity/domain/permission-catalog';
import {
  createPricingPolicy,
  listPricingPolicies,
} from '@/modules/dynamic-pricing/infrastructure/pricing-policy-repository';
import { getMarketplacePressure } from '@/modules/dynamic-pricing/application/pricing-pressure-service';
import { recordAuditLog } from '@/shared/audit/audit-service';

const createPolicySchema = z.object({
  name: z.string().min(2),
  description: z.string().optional(),
  bookingType: z.nativeEnum(BookingType).optional().nullable(),
  zoneId: z.string().optional().nullable(),
  minimumPressure: z.enum(['NORMAL', 'ELEVATED', 'HIGH', 'CRITICAL']).optional(),
  maximumPressure: z.enum(['NORMAL', 'ELEVATED', 'HIGH', 'CRITICAL']).optional(),
  adjustmentPercentage: z.number().min(0).max(200),
  maxAdjustmentPercentage: z.number().min(0).max(200).optional(),
  flatSurgeAmount: z.number().min(0).optional(),
  effectiveFrom: z.string().datetime().optional().nullable(),
  effectiveUntil: z.string().datetime().optional().nullable(),
});

export const GET = withPermission(PERMISSIONS.ADMIN_PRICING_MANAGE, async () => {
  const policies = await listPricingPolicies();
  const pressure = await getMarketplacePressure();

  return NextResponse.json(
    {
      policies,
      currentPressure: pressure,
    },
    { status: 200 },
  );
});

export const POST = withPermission(PERMISSIONS.ADMIN_PRICING_MANAGE, async (req, { principal }) => {
  const body = await req.json();
  const parsed = createPolicySchema.parse(body);

  const policy = await createPricingPolicy({
    ...parsed,
    effectiveFrom: parsed.effectiveFrom ? new Date(parsed.effectiveFrom) : null,
    effectiveUntil: parsed.effectiveUntil ? new Date(parsed.effectiveUntil) : null,
    createdBy: principal.userId,
  });

  await recordAuditLog(prisma, {
    actorUserId: principal.userId,
    action: 'admin.pricing_policy.created',
    entityType: 'DynamicPricingPolicy',
    entityId: policy.id,
    beforeState: null,
    afterState: { policyName: policy.name, status: policy.status },
    requestMetadata: { ipAddress: req.headers.get('x-forwarded-for') },
  });

  return NextResponse.json({ policy }, { status: 201 });
});
