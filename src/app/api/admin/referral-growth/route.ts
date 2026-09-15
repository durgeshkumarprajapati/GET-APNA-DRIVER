import 'server-only';
import { NextResponse } from 'next/server';
import { withPermission } from '@/modules/identity/authorization/route-guard';
import { PERMISSIONS } from '@/modules/identity/domain/permission-catalog';
import { getReferralGrowthFunnelAnalytics } from '@/modules/identity/application/services/referral-service';
import { toErrorResponse } from '@/shared/errors/app-error';

export const GET = withPermission(PERMISSIONS.ADMIN_REFERRAL_READ, async (req) => {
  try {
    const analytics = await getReferralGrowthFunnelAnalytics();
    return NextResponse.json({ analytics }, { status: 200 });
  } catch (error: unknown) {
    return toErrorResponse(error, req.nextUrl.pathname);
  }
});
