import 'server-only';
import { NextResponse } from 'next/server';
import { withAuth } from '@/modules/identity/authorization/route-guard';
import { acceptInvitation } from '@/modules/corporate/domain/organization-service';
import { toErrorResponse } from '@/shared/errors/app-error';

export const POST = withAuth(async (req, { principal }) => {
  try {
    const body = await req.json();
    const { token } = body;

    if (!token) {
      return NextResponse.json({ error: 'Invitation token is required' }, { status: 400 });
    }

    const result = await acceptInvitation(principal.userId, token);

    return NextResponse.json(result, { status: 200 });
  } catch (error: unknown) {
    return toErrorResponse(error, req.nextUrl.pathname);
  }
});
