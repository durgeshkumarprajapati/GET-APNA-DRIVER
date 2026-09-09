import { NextResponse } from 'next/server';
import { withAuth } from '@/modules/identity/authorization/route-guard';
import { requestEmailVerification } from '@/modules/identity/application/services/auth-service';

export const POST = withAuth(async (_req, { principal }) => {
  await requestEmailVerification(principal.userId);
  return NextResponse.json({ message: 'Verification email dispatched' }, { status: 200 });
});
