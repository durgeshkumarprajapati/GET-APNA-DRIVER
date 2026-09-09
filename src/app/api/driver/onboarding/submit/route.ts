import 'server-only';
import { NextResponse } from 'next/server';
import { withAuth } from '@/modules/identity/authorization/route-guard';
import { submitOnboarding } from '@/modules/driver/application/services/driver-onboarding-service';

export const POST = withAuth(async (req, { principal }) => {
  const profile = await submitOnboarding(principal.userId, {
    ipAddress: req.headers.get('x-forwarded-for'),
  });

  return NextResponse.json({ profile }, { status: 200 });
});
