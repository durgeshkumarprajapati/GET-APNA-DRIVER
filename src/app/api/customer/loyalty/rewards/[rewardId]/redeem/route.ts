import 'server-only';
import { NextResponse } from 'next/server';
import { withPermission } from '@/modules/identity/authorization/route-guard';
import { PERMISSIONS } from '@/modules/identity/domain/permission-catalog';
import { redeemReward } from '@/modules/loyalty/application/services/loyalty-reward-service';

export const POST = withPermission(
  PERMISSIONS.CUSTOMER_REWARDS_REDEEM,
  async (req, { principal }, routeContext?: { params: Promise<{ rewardId: string }> }) => {
    const { rewardId } = (await routeContext?.params) ?? { rewardId: '' };
    const body = await req.json().catch(() => ({}));

    const redemption = await redeemReward(principal.userId, rewardId, body?.idempotencyKey);
    return NextResponse.json({ success: true, data: redemption }, { status: 201 });
  },
);
