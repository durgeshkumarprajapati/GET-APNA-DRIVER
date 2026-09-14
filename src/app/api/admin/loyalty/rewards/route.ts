import 'server-only';
import { NextResponse } from 'next/server';
import { withPermission } from '@/modules/identity/authorization/route-guard';
import { PERMISSIONS } from '@/modules/identity/domain/permission-catalog';
import {
  createLoyaltyReward,
  listCustomerLoyaltyRewards,
} from '@/modules/loyalty/application/services/loyalty-reward-service';

export const GET = withPermission(PERMISSIONS.ADMIN_LOYALTY_READ, async (req) => {
  const { searchParams } = new URL(req.url);
  const customerId = searchParams.get('customerId') ?? '';
  const rewards = await listCustomerLoyaltyRewards(customerId);
  return NextResponse.json({ success: true, data: rewards }, { status: 200 });
});

export const POST = withPermission(PERMISSIONS.ADMIN_LOYALTY_MANAGE, async (req) => {
  const body = await req.json();
  const reward = await createLoyaltyReward(body);
  return NextResponse.json({ success: true, data: reward }, { status: 201 });
});
