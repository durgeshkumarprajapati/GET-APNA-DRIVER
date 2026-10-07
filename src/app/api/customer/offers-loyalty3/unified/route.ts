import 'server-only';
import { NextResponse } from 'next/server';
import { withPermission } from '@/modules/identity/authorization/route-guard';
import { PERMISSIONS } from '@/modules/identity/domain/permission-catalog';
import { getUnifiedOffersLoyalty3 } from '@/modules/loyalty/application/services/offers-loyalty3-service';

export const GET = withPermission(
  PERMISSIONS.PROMOTIONS_READ,
  async (_req, { principal }) => {
    const data = await getUnifiedOffersLoyalty3(principal.userId);
    return NextResponse.json(data, { status: 200 });
  },
);
