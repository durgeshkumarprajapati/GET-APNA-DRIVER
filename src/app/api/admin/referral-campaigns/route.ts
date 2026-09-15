import 'server-only';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { withPermission } from '@/modules/identity/authorization/route-guard';
import { PERMISSIONS } from '@/modules/identity/domain/permission-catalog';
import {
  getReferralCampaigns,
  createReferralCampaign,
} from '@/modules/identity/application/services/referral-service';
import { ReferralAudience, ReferralRewardType } from '@prisma/client';
import { toErrorResponse } from '@/shared/errors/app-error';

const CreateCampaignSchema = z.object({
  code: z.string().min(3).max(30),
  name: z.string().min(3).max(100),
  description: z.string().optional(),
  audience: z.nativeEnum(ReferralAudience).optional(),
  rewardType: z.nativeEnum(ReferralRewardType).optional(),
  referrerRewardValue: z.number().positive(),
  refereeRewardValue: z.number().nonnegative().optional(),
  maxRewardsTotal: z.number().int().positive().optional(),
  maxRewardsPerUser: z.number().int().positive().optional(),
  qualificationTrigger: z.string().optional(),
  qualificationMinTrips: z.number().int().positive().optional(),
  qualificationMinAmount: z.number().nonnegative().optional(),
  startsAt: z
    .string()
    .datetime()
    .optional()
    .transform((str) => (str ? new Date(str) : undefined)),
  endsAt: z
    .string()
    .datetime()
    .optional()
    .transform((str) => (str ? new Date(str) : undefined)),
});

export const GET = withPermission(PERMISSIONS.ADMIN_REFERRAL_READ, async (req) => {
  try {
    const campaigns = await getReferralCampaigns();
    return NextResponse.json({ campaigns }, { status: 200 });
  } catch (error: unknown) {
    return toErrorResponse(error, req.nextUrl.pathname);
  }
});

export const POST = withPermission(
  PERMISSIONS.ADMIN_REFERRAL_MANAGE,
  async (req, { principal }) => {
    try {
      const json = await req.json().catch(() => ({}));
      const parseResult = CreateCampaignSchema.safeParse(json);

      if (!parseResult.success) {
        return NextResponse.json(
          { error: 'Invalid campaign configuration.', details: parseResult.error.flatten() },
          { status: 400 },
        );
      }

      const campaign = await createReferralCampaign(parseResult.data, principal.userId);
      return NextResponse.json({ campaign }, { status: 201 });
    } catch (error: unknown) {
      return toErrorResponse(error, req.nextUrl.pathname);
    }
  },
);
