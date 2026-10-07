import 'server-only';
import { NextResponse } from 'next/server';
import { withPermission } from '@/modules/identity/authorization/route-guard';
import { PERMISSIONS } from '@/modules/identity/domain/permission-catalog';
import { getMarketplaceExpansionReport } from '@/modules/location/application/services/marketplace-expansion-service';

export const GET = withPermission(PERMISSIONS.ADMIN_MARKETPLACE_INTELLIGENCE_READ, async (_req) => {
  const report = await getMarketplaceExpansionReport();
  return NextResponse.json(report, { status: 200 });
});
