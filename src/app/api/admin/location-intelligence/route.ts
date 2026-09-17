import 'server-only';
import { NextResponse } from 'next/server';
import { withAuth } from '@/modules/identity/authorization/route-guard';
import { getAdminLocationIntelligenceSummary } from '@/modules/location-intelligence/application/location-intelligence-service';
import { toErrorResponse } from '@/shared/errors/app-error';

export const GET = withAuth(async (req) => {
  try {
    const summary = await getAdminLocationIntelligenceSummary();
    return NextResponse.json({ summary });
  } catch (error: unknown) {
    return toErrorResponse(error, req.nextUrl.pathname);
  }
});
