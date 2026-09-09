import 'server-only';
import { NextResponse } from 'next/server';
import { withPermission } from '@/modules/identity/authorization/route-guard';
import { PERMISSIONS } from '@/modules/identity/domain/permission-catalog';
import { cancelCampaign } from '@/modules/notification/application/notification-campaign-service';

export const POST = withPermission(
  PERMISSIONS.NOTIFICATIONS_CAMPAIGN_CANCEL,
  async (req, { principal }, routeContext?: { params: Promise<{ campaignId: string }> }) => {
    const params = await routeContext?.params;
    const campaignId = params?.campaignId;

    if (!campaignId) {
      return NextResponse.json({ error: 'Campaign ID required' }, { status: 400 });
    }

    const campaign = await cancelCampaign(principal.userId, campaignId, {
      ipAddress: req.headers.get('x-forwarded-for'),
    });

    return NextResponse.json({ campaign }, { status: 200 });
  },
);
