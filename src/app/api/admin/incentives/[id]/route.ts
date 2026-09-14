import 'server-only';
import { NextResponse } from 'next/server';
import { withPermission } from '@/modules/identity/authorization/route-guard';
import { PERMISSIONS } from '@/modules/identity/domain/permission-catalog';
import {
  getCampaignById,
  updateCampaign,
  updateCampaignStatus,
} from '@/modules/incentive/application/services/incentive-campaign-service';

export const GET = withPermission(
  PERMISSIONS.ADMIN_INCENTIVES_MANAGE,
  async (_req, _context, routeContext?: { params: Promise<{ id: string }> }) => {
    const { id } = (await routeContext?.params) ?? { id: '' };
    const campaign = await getCampaignById(id);
    return NextResponse.json({ success: true, data: campaign }, { status: 200 });
  },
);

export const PATCH = withPermission(
  PERMISSIONS.ADMIN_INCENTIVES_MANAGE,
  async (req, _context, routeContext?: { params: Promise<{ id: string }> }) => {
    const { id } = (await routeContext?.params) ?? { id: '' };
    const body = await req.json();

    let campaign;
    if (body.status) {
      campaign = await updateCampaignStatus(id, body.status);
    }

    delete body.status;
    if (Object.keys(body).length > 0) {
      campaign = await updateCampaign(id, body);
    }

    if (!campaign) {
      campaign = await getCampaignById(id);
    }

    return NextResponse.json({ success: true, data: campaign }, { status: 200 });
  },
);
