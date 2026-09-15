import 'server-only';
import { NextResponse } from 'next/server';
import { withAuth } from '@/modules/identity/authorization/route-guard';
import { getCustomerReferralDashboard } from '@/modules/identity/application/services/referral-service';
import { toErrorResponse } from '@/shared/errors/app-error';

export const GET = withAuth(async (req, { principal }) => {
  try {
    const origin = req.nextUrl.origin || 'https://getapnadriver.com';
    const dashboard = await getCustomerReferralDashboard(principal.userId, origin);
    return NextResponse.json({ dashboard }, { status: 200 });
  } catch (error: unknown) {
    return toErrorResponse(error, req.nextUrl.pathname);
  }
});
