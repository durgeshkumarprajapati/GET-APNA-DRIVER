import 'server-only';
import { NextResponse } from 'next/server';
import { withPermission } from '@/modules/identity/authorization/route-guard';
import { PERMISSIONS } from '@/modules/identity/domain/permission-catalog';
import { getCustomerLoyaltySummary } from '@/modules/loyalty/application/services/loyalty-account-service';

export const GET = withPermission(PERMISSIONS.CUSTOMER_LOYALTY_READ, async (_req, { principal }) => {
  const summary = await getCustomerLoyaltySummary(principal.userId);
  return NextResponse.json({ success: true, data: summary }, { status: 200 });
});
