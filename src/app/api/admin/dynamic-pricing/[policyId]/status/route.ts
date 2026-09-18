import 'server-only';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { DynamicPricingPolicyStatus } from '@prisma/client';
import { prisma } from '@/shared/database/prisma';
import { withPermission } from '@/modules/identity/authorization/route-guard';
import { PERMISSIONS } from '@/modules/identity/domain/permission-catalog';
import { updatePricingPolicyStatus } from '@/modules/dynamic-pricing/infrastructure/pricing-policy-repository';
import { recordAuditLog } from '@/shared/audit/audit-service';

interface RouteParams {
  params: Promise<{ policyId: string }>;
}

const updateStatusSchema = z.object({
  status: z.nativeEnum(DynamicPricingPolicyStatus),
});

export const PUT = withPermission<RouteParams>(
  PERMISSIONS.ADMIN_PRICING_MANAGE,
  async (req, { principal }, routeContext) => {
    const { policyId } = await routeContext!.params;
    const body = await req.json();
    const parsed = updateStatusSchema.parse(body);

    const policy = await updatePricingPolicyStatus(policyId, parsed.status);

    await recordAuditLog(prisma, {
      actorUserId: principal.userId,
      action: 'admin.pricing_policy.status_updated',
      entityType: 'DynamicPricingPolicy',
      entityId: policy.id,
      beforeState: null,
      afterState: { status: policy.status, version: policy.version },
      requestMetadata: { ipAddress: req.headers.get('x-forwarded-for') },
    });

    return NextResponse.json({ policy }, { status: 200 });
  },
);
