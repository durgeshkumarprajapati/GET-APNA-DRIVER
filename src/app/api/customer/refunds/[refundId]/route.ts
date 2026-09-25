import 'server-only';
import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/modules/identity/authorization/route-guard';
import { getRefundDocument } from '@/modules/billing/billing-service';
import { toErrorResponse } from '@/shared/errors/app-error';

export const GET = withAuth(async (_req: NextRequest, { principal }, routeContext?: unknown) => {
  try {
    const { refundId } = (routeContext as { params: Promise<{ refundId: string }> })?.params
      ? await (routeContext as { params: Promise<{ refundId: string }> }).params
      : { refundId: '' };

    if (!refundId) {
      return NextResponse.json(
        { error: 'MISSING_REFUND_ID', message: 'Refund ID is required' },
        { status: 400 },
      );
    }

    const refundDoc = await getRefundDocument(principal.userId, refundId);

    if (!refundDoc) {
      return NextResponse.json(
        { error: 'REFUND_NOT_FOUND', message: 'Refund document not found' },
        { status: 404 },
      );
    }

    return NextResponse.json({
      success: true,
      refund: refundDoc,
    });
  } catch (err: unknown) {
    return toErrorResponse(err, _req.nextUrl.pathname);
  }
});
