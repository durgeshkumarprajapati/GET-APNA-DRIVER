import 'server-only';
import { NextResponse } from 'next/server';
import { withPermission } from '@/modules/identity/authorization/route-guard';
import { PERMISSIONS } from '@/modules/identity/domain/permission-catalog';
import { activatePromotion } from '@/modules/promotion/application/services/promotion-service';

interface RouteParams {
  params: Promise<{ promotionId: string }>;
}

export const POST = withPermission<RouteParams>(
  PERMISSIONS.PROMOTIONS_MANAGE,
  async (_req, { principal }, routeContext) => {
    const { promotionId } = await routeContext!.params;
    const promotion = await activatePromotion(principal.userId, promotionId);
    return NextResponse.json({ promotion }, { status: 200 });
  },
);
