import 'server-only';
import { NextResponse } from 'next/server';
import { withRole } from '@/modules/identity/authorization/route-guard';
import { SYSTEM_ROLE_CODES } from '@/modules/identity/domain/role-catalog';
import { submitOnboarding } from '@/modules/driver/application/services/driver-onboarding-service';

export const POST = withRole(SYSTEM_ROLE_CODES.DRIVER, async (req, { principal }) => {
  const profile = await submitOnboarding(principal.userId, {
    ipAddress: req.headers.get('x-forwarded-for'),
  });

  return NextResponse.json({ profile }, { status: 200 });
});
