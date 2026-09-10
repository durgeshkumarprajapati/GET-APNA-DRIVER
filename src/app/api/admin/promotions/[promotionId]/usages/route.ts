import 'server-only';
import { NextResponse } from 'next/server';
import { withPermission } from '@/modules/identity/authorization/route-guard';
import { PERMISSIONS } from '@/modules/identity/domain/permission-catalog';
import { listPromotionUsages } from '@/modules/promotion/application/services/promotion-service';

interface RouteParams {
  params: Promise<{ promotionId: string }>;
}

export const GET = withPermission<RouteParams>(
  PERMISSIONS.PROMOTIONS_MANAGE,
  async (req, _context, routeContext) => {
    const { promotionId } = await routeContext!.params;
    const { searchParams } = new URL(req.url);
    const page = Number(searchParams.get('page') ?? '1');
    const pageSize = Number(searchParams.get('pageSize') ?? '25');

    const result = await listPromotionUsages(promotionId, {
      page: Number.isFinite(page) && page > 0 ? page : 1,
      pageSize: Number.isFinite(pageSize) && pageSize > 0 ? pageSize : 25,
    });
    return NextResponse.json(result, { status: 200 });
  },
);
