import 'server-only';
import { NextResponse } from 'next/server';
import { withPermission } from '@/modules/identity/authorization/route-guard';
import { PERMISSIONS } from '@/modules/identity/domain/permission-catalog';
import {
  createLoyaltyReward,
  listCustomerLoyaltyRewards,
  listAllLoyaltyRewardsForAdmin,
} from '@/modules/loyalty/application/services/loyalty-reward-service';

export const GET = withPermission(PERMISSIONS.ADMIN_LOYALTY_READ, async (req) => {
  try {
    const { searchParams } = new URL(req.url);
    const customerId = searchParams.get('customerId');

    if (customerId) {
      const rewards = await listCustomerLoyaltyRewards(customerId);
      return NextResponse.json({ success: true, rewards, data: rewards }, { status: 200 });
    }

    const rewards = await listAllLoyaltyRewardsForAdmin();
    return NextResponse.json({ success: true, rewards, data: rewards }, { status: 200 });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Failed to load customer rewards catalog';
    return NextResponse.json(
      { success: false, error: 'REWARDS_FETCH_FAILED', message },
      { status: 500 },
    );
  }
});

export const POST = withPermission(PERMISSIONS.ADMIN_LOYALTY_MANAGE, async (req) => {
  try {
    const body = await req.json();
    const reward = await createLoyaltyReward(body);
    return NextResponse.json({ success: true, reward, data: reward }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to create reward';
    return NextResponse.json(
      { success: false, error: 'REWARD_CREATE_FAILED', message },
      { status: 500 },
    );
  }
});
