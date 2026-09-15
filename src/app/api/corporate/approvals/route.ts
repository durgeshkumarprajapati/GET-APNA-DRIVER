import 'server-only';
import { NextResponse } from 'next/server';
import { withAuth } from '@/modules/identity/authorization/route-guard';
import { getUserActiveOrganization } from '@/modules/corporate/domain/organization-service';
import {
  listOrganizationApprovals,
  createApprovalRequest,
} from '@/modules/corporate/domain/corporate-approval-service';
import { ApprovalStatus } from '@prisma/client';
import { toErrorResponse } from '@/shared/errors/app-error';

export const GET = withAuth(async (req, { principal }) => {
  try {
    const membership = await getUserActiveOrganization(principal.userId);
    if (!membership) {
      return NextResponse.json({ error: 'Corporate organization not found' }, { status: 404 });
    }
    const rawStatus = req.nextUrl.searchParams.get('status');
    const statusParam = rawStatus && Object.values(ApprovalStatus).includes(rawStatus as ApprovalStatus)
      ? (rawStatus as ApprovalStatus)
      : undefined;

    const approvals = await listOrganizationApprovals(membership.organizationId, statusParam);

    return NextResponse.json({ approvals }, { status: 200 });
  } catch (error: unknown) {
    return toErrorResponse(error, req.nextUrl.pathname);
  }
});

export const POST = withAuth(async (req, { principal }) => {
  try {
    const membership = await getUserActiveOrganization(principal.userId);
    if (!membership) {
      return NextResponse.json({ error: 'Corporate organization not found' }, { status: 404 });
    }
    const body = await req.json();

    const approval = await createApprovalRequest({
      organizationId: membership.organizationId,
      requesterUserId: principal.userId,
      bookingParameters: body.bookingParameters,
      policyViolations: body.policyViolations,
      reason: body.reason,
    });

    return NextResponse.json({ approval }, { status: 201 });
  } catch (error: unknown) {
    return toErrorResponse(error, req.nextUrl.pathname);
  }
});
