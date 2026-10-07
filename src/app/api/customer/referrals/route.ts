import 'server-only';
import { NextResponse } from 'next/server';
import { withAuth } from '@/modules/identity/authorization/route-guard';
import { getEnhancedReferralDashboard } from '@/modules/identity/application/services/viral-referral-service';
import { toErrorResponse } from '@/shared/errors/app-error';

export const GET = withAuth(async (req, { principal }) => {
  try {
    const origin = req.nextUrl.origin || 'https://getapnadriver.com';
    const dashboard = await getEnhancedReferralDashboard(principal.userId, origin);
    return NextResponse.json({ dashboard }, { status: 200 });
  } catch (error: unknown) {
    return toErrorResponse(error, req.nextUrl.pathname);
  }
});
