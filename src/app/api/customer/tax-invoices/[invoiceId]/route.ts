import 'server-only';
import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/modules/identity/authorization/route-guard';
import { getCustomerInvoiceById } from '@/modules/tax-invoices/invoice-service';

export const GET = withAuth(async (_req: NextRequest, { principal }, routeContext?: unknown) => {
  try {
    const { invoiceId } = (routeContext as { params: Promise<{ invoiceId: string }> })?.params ? await (routeContext as { params: Promise<{ invoiceId: string }> }).params : { invoiceId: '' };
    if (!invoiceId) {
      return NextResponse.json({ error: 'MISSING_INVOICE_ID', message: 'Invoice ID is required' }, { status: 400 });
    }

    const invoice = await getCustomerInvoiceById(principal.userId, invoiceId);
    if (!invoice) {
      return NextResponse.json({ error: 'INVOICE_NOT_FOUND', message: 'Tax invoice not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      invoice,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to fetch tax invoice details.';
    return NextResponse.json({ error: 'INVOICE_FETCH_FAILED', message }, { status: 500 });
  }
});
