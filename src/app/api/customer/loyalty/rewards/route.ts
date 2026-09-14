import 'server-only';
import { NextResponse } from 'next/server';
import { withPermission } from '@/modules/identity/authorization/route-guard';
import { PERMISSIONS } from '@/modules/identity/domain/permission-catalog';
import { listCustomerLoyaltyRewards } from '@/modules/loyalty/application/services/loyalty-reward-service';

export const GET = withPermission(PERMISSIONS.CUSTOMER_LOYALTY_READ, async (_req, { principal }) => {
  const rewards = await listCustomerLoyaltyRewards(principal.userId);
  return NextResponse.json({ success: true, data: rewards }, { status: 200 });
});
