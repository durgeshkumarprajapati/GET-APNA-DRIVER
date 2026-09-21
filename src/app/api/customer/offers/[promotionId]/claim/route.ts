import 'server-only';
import { NextResponse } from 'next/server';
import { withPermission } from '@/modules/identity/authorization/route-guard';
import { PERMISSIONS } from '@/modules/identity/domain/permission-catalog';
import { claimCustomerOffer } from '@/modules/promotion/application/services/promotion-eligibility-service';

type RouteParams = { params: Promise<{ promotionId: string }> };

export const POST = withPermission<RouteParams>(
  PERMISSIONS.PROMOTIONS_READ,
  async (_req, { principal }, routeContext) => {
    try {
      const { promotionId } = await routeContext!.params;
      const result = await claimCustomerOffer(principal.userId, promotionId);

      return NextResponse.json({ claim: result }, { status: 200 });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to claim offer.';
      if (message.includes('not found')) {
        return NextResponse.json({ error: 'PROMOTION_NOT_FOUND', message }, { status: 404 });
      }
      return NextResponse.json({ error: 'CLAIM_OFFER_FAILED', message }, { status: 500 });
    }
  },
);
