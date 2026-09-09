import 'server-only';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { withPermission } from '@/modules/identity/authorization/route-guard';
import { PERMISSIONS } from '@/modules/identity/domain/permission-catalog';
import {
  listCampaigns,
  createCampaign,
} from '@/modules/notification/application/notification-campaign-service';
import { CampaignTargetAudience } from '@prisma/client';

const createCampaignSchema = z.object({
  title: z.string().min(1),
  body: z.string().min(1),
  targetAudience: z.nativeEnum(CampaignTargetAudience),
  targetUserIds: z.array(z.string().uuid()).optional(),
  scheduledAt: z.string().optional(),
});

export const GET = withPermission(PERMISSIONS.NOTIFICATIONS_MANAGE, async (req) => {
  const { searchParams } = new URL(req.url);
  const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!, 10) : 20;
  const offset = searchParams.get('offset') ? parseInt(searchParams.get('offset')!, 10) : 0;

  const result = await listCampaigns(limit, offset);
  return NextResponse.json(result, { status: 200 });
});

export const POST = withPermission(
  PERMISSIONS.NOTIFICATIONS_CAMPAIGN_CREATE,
  async (req, { principal }) => {
    const body = await req.json();
    const parsed = createCampaignSchema.parse(body);

    const campaign = await createCampaign(principal.userId, parsed, {
      ipAddress: req.headers.get('x-forwarded-for'),
    });

    return NextResponse.json({ campaign }, { status: 201 });
  },
);
