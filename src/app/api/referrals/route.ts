import 'server-only';
import { NextResponse } from 'next/server';
import { withAuth } from '@/modules/identity/authorization/route-guard';
import { getReferralSummaryForUser } from '@/modules/identity/application/services/referral-service';
import { toErrorResponse } from '@/shared/errors/app-error';

export const GET = withAuth(async (req, { principal }) => {
  try {
    const summary = await getReferralSummaryForUser(principal.userId);
    return NextResponse.json({ summary }, { status: 200 });
  } catch (error: unknown) {
    return toErrorResponse(error, req.nextUrl.pathname);
  }
});
