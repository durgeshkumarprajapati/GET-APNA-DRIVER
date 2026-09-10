import 'server-only';
import { NextResponse } from 'next/server';
import { withPermission } from '@/modules/identity/authorization/route-guard';
import { PERMISSIONS } from '@/modules/identity/domain/permission-catalog';
import { getCustomerOffers } from '@/modules/promotion/application/services/promotion-eligibility-service';

export const GET = withPermission(PERMISSIONS.PROMOTIONS_READ, async (_req, { principal }) => {
  const offers = await getCustomerOffers(principal.userId);
  return NextResponse.json(offers, { status: 200 });
});
