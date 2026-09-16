import 'server-only';
import { NextResponse } from 'next/server';
import { withPermission } from '@/modules/identity/authorization/route-guard';
import { PERMISSIONS } from '@/modules/identity/domain/permission-catalog';
import { parseAnalyticsDateRange } from '@/modules/analytics/analytics-service';
import { getCampaignSignals } from '@/modules/marketplace-intelligence/domain/campaign-signals-service';

export const GET = withPermission(PERMISSIONS.ADMIN_MARKETPLACE_INTELLIGENCE_READ, async (req) => {
  try {
    const searchParams = req.nextUrl.searchParams;
    const rangeParam = searchParams.get('range');
    const startParam = searchParams.get('start');
    const endParam = searchParams.get('end');

    const dateRange = parseAnalyticsDateRange(rangeParam, startParam, endParam);

    const campaignSignals = await getCampaignSignals(dateRange.startDate, dateRange.endDate);

    return NextResponse.json(campaignSignals);
  } catch (error: unknown) {
    return NextResponse.json(
      { error: (error as Error).message || 'Internal Server Error' },
      { status: 500 },
    );
  }
});
