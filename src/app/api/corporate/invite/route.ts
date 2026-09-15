import 'server-only';
import { NextResponse } from 'next/server';
import { withAuth } from '@/modules/identity/authorization/route-guard';
import {
  getUserActiveOrganization,
  createInvitation,
} from '@/modules/corporate/domain/organization-service';
import { toErrorResponse } from '@/shared/errors/app-error';

export const POST = withAuth(async (req, { principal }) => {
  try {
    const membership = await getUserActiveOrganization(principal.userId);
    if (!membership) {
      return NextResponse.json({ error: 'Corporate organization not found' }, { status: 404 });
    }
    const body = await req.json();
    const { email, role } = body;

    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    const { invitation, rawToken } = await createInvitation({
      organizationId: membership.organizationId,
      invitedByUserId: principal.userId,
      email,
      role,
    });

    const inviteUrl = `/corporate/invite/accept?token=${rawToken}`;

    return NextResponse.json({ invitation, rawToken, inviteUrl }, { status: 201 });
  } catch (error: unknown) {
    return toErrorResponse(error, req.nextUrl.pathname);
  }
});
