import { NextResponse } from 'next/server';
import { withAuth } from '@/modules/identity/authorization/route-guard';
import { revokeAllSessionsForUser } from '@/modules/identity/application/services/session-service';

export const POST = withAuth(async (_req, { principal }) => {
  await revokeAllSessionsForUser(principal.userId, principal.userId);
  return NextResponse.json(
    { message: 'Successfully logged out from all devices' },
    { status: 200 },
  );
});
