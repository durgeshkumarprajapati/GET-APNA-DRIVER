import 'server-only';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { withPermission } from '@/modules/identity/authorization/route-guard';
import { PERMISSIONS } from '@/modules/identity/domain/permission-catalog';
import { updateReferralCampaignStatus } from '@/modules/identity/application/services/referral-service';
import { ReferralCampaignStatus } from '@prisma/client';
import { toErrorResponse } from '@/shared/errors/app-error';

interface RouteParams {
  params: Promise<{ id: string }>;
}

const UpdateStatusSchema = z.object({
  status: z.nativeEnum(ReferralCampaignStatus),
});

export const PATCH = withPermission<RouteParams>(
  PERMISSIONS.ADMIN_REFERRAL_MANAGE,
  async (req, { principal }, routeContext) => {
    try {
      const { id: campaignId } = await routeContext!.params;
      const json = await req.json().catch(() => ({}));
      const parseResult = UpdateStatusSchema.safeParse(json);

      if (!parseResult.success) {
        return NextResponse.json(
          { error: 'Invalid campaign status update.', details: parseResult.error.flatten() },
          { status: 400 },
        );
      }

      const campaign = await updateReferralCampaignStatus(
        campaignId,
        parseResult.data.status,
        principal.userId,
      );

      return NextResponse.json({ campaign }, { status: 200 });
    } catch (error: unknown) {
      return toErrorResponse(error, req.nextUrl.pathname);
    }
  },
);
