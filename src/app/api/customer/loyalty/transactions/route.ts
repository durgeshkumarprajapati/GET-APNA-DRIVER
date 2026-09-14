import 'server-only';
import { NextResponse } from 'next/server';
import { withPermission } from '@/modules/identity/authorization/route-guard';
import { PERMISSIONS } from '@/modules/identity/domain/permission-catalog';
import { listCustomerLoyaltyTransactions } from '@/modules/loyalty/application/services/loyalty-account-service';

export const GET = withPermission(PERMISSIONS.CUSTOMER_LOYALTY_READ, async (req, { principal }) => {
  const { searchParams } = new URL(req.url);
  const take = parseInt(searchParams.get('take') ?? '20', 10);
  const skip = parseInt(searchParams.get('skip') ?? '0', 10);

  const transactions = await listCustomerLoyaltyTransactions(principal.userId, take, skip);
  return NextResponse.json({ success: true, data: transactions }, { status: 200 });
});
