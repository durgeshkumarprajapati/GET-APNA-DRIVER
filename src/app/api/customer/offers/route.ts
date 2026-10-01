import 'server-only';
import { NextResponse } from 'next/server';
import { withPermission } from '@/modules/identity/authorization/route-guard';
import { PERMISSIONS } from '@/modules/identity/domain/permission-catalog';
import { getCustomerOffers } from '@/modules/promotion/application/services/promotion-eligibility-service';
import { getUnifiedOffersAndRewardsCenter } from '@/modules/loyalty/application/offers-rewards-center-service';

export const GET = withPermission(PERMISSIONS.PROMOTIONS_READ, async (_req, { principal }) => {
  const [offers, unifiedCenter] = await Promise.all([
    getCustomerOffers(principal.userId),
    getUnifiedOffersAndRewardsCenter(principal.userId),
  ]);
  return NextResponse.json({ ...offers, unifiedCenter }, { status: 200 });
});
