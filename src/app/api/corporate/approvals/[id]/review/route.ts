import 'server-only';
import { NextResponse } from 'next/server';
import { withAuth } from '@/modules/identity/authorization/route-guard';
import { reviewApprovalRequest } from '@/modules/corporate/domain/corporate-approval-service';
import { toErrorResponse } from '@/shared/errors/app-error';

export const POST = withAuth(async (req, { principal }, routeContext?: unknown) => {
  try {
    const routeParams = await (routeContext as { params: Promise<{ id: string }> })?.params;
    const id = routeParams?.id;

    if (!id) {
      return NextResponse.json({ error: 'Missing approval request ID' }, { status: 400 });
    }

    const body = await req.json();
    const { status, reviewComment } = body;

    if (status !== 'APPROVED' && status !== 'REJECTED') {
      return NextResponse.json({ error: 'Status must be APPROVED or REJECTED' }, { status: 400 });
    }

    const updated = await reviewApprovalRequest({
      approvalRequestId: id,
      approverUserId: principal.userId,
      status,
      reviewComment,
    });

    return NextResponse.json({ approval: updated }, { status: 200 });
  } catch (error: unknown) {
    return toErrorResponse(error, req.nextUrl.pathname);
  }
});
