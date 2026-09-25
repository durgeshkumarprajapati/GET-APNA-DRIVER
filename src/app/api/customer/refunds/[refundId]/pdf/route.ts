import 'server-only';
import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/modules/identity/authorization/route-guard';
import { getRefundDocument } from '@/modules/billing/billing-service';
import { generateRefundPdfBuffer } from '@/modules/billing/refund-pdf-generator';
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

    const pdfBuffer = await generateRefundPdfBuffer(refundDoc);

    const headers = new Headers();
    headers.set('Content-Type', 'application/pdf');
    headers.set('Content-Disposition', `inline; filename="refund-${refundDoc.refundNumber}.pdf"`);
    headers.set('Content-Length', pdfBuffer.length.toString());

    return new NextResponse(new Uint8Array(pdfBuffer), {
      status: 200,
      headers,
    });
  } catch (err: unknown) {
    return toErrorResponse(err, _req.nextUrl.pathname);
  }
});
