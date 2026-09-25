import 'server-only';
import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/modules/identity/authorization/route-guard';
import { getCustomerPaymentReceipt } from '@/modules/billing/billing-service';
import { generateReceiptPdfBuffer } from '@/modules/billing/receipt-pdf-generator';
import { toErrorResponse } from '@/shared/errors/app-error';

export const GET = withAuth(async (_req: NextRequest, { principal }, routeContext?: unknown) => {
  try {
    const { paymentId } = (routeContext as { params: Promise<{ paymentId: string }> })?.params
      ? await (routeContext as { params: Promise<{ paymentId: string }> }).params
      : { paymentId: '' };

    if (!paymentId) {
      return NextResponse.json(
        { error: 'MISSING_PAYMENT_ID', message: 'Payment ID is required' },
        { status: 400 },
      );
    }

    const receipt = await getCustomerPaymentReceipt(principal.userId, paymentId);

    if (!receipt) {
      return NextResponse.json(
        { error: 'RECEIPT_NOT_FOUND', message: 'Payment receipt not found' },
        { status: 404 },
      );
    }

    const pdfBuffer = await generateReceiptPdfBuffer(receipt);

    const headers = new Headers();
    headers.set('Content-Type', 'application/pdf');
    headers.set('Content-Disposition', `inline; filename="receipt-${receipt.receiptNumber}.pdf"`);
    headers.set('Content-Length', pdfBuffer.length.toString());

    return new NextResponse(new Uint8Array(pdfBuffer), {
      status: 200,
      headers,
    });
  } catch (err: unknown) {
    return toErrorResponse(err, _req.nextUrl.pathname);
  }
});
