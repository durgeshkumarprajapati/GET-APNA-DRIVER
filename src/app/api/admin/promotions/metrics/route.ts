import 'server-only';
import { NextResponse } from 'next/server';
import { withPermission } from '@/modules/identity/authorization/route-guard';
import { PERMISSIONS } from '@/modules/identity/domain/permission-catalog';
import { getPromotionAnalytics } from '@/modules/promotion/application/services/promotion-service';

export const GET = withPermission(PERMISSIONS.PROMOTIONS_MANAGE, async () => {
  const analytics = await getPromotionAnalytics();
  return NextResponse.json({ analytics }, { status: 200 });
});
