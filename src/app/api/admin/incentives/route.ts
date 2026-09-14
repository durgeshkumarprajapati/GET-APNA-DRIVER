import 'server-only';
import { NextResponse } from 'next/server';
import { withPermission } from '@/modules/identity/authorization/route-guard';
import { PERMISSIONS } from '@/modules/identity/domain/permission-catalog';
import { createCampaign, listCampaigns } from '@/modules/incentive/application/services/incentive-campaign-service';
import type { IncentiveCampaignStatus, IncentiveType } from '@prisma/client';

export const GET = withPermission(PERMISSIONS.ADMIN_INCENTIVES_MANAGE, async (req) => {
  const { searchParams } = new URL(req.url);
  const status = searchParams.get('status') as IncentiveCampaignStatus | undefined;
  const incentiveType = searchParams.get('incentiveType') as IncentiveType | undefined;

  const campaigns = await listCampaigns({
    status: status || undefined,
    incentiveType: incentiveType || undefined,
  });

  return NextResponse.json({ success: true, data: campaigns }, { status: 200 });
});

export const POST = withPermission(PERMISSIONS.ADMIN_INCENTIVES_MANAGE, async (req) => {
  const body = await req.json();
  const campaign = await createCampaign(body);
  return NextResponse.json({ success: true, data: campaign }, { status: 201 });
});
