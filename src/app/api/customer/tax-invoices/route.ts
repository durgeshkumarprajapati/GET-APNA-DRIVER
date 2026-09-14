import 'server-only';
import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/modules/identity/authorization/route-guard';
import { getCustomerInvoices } from '@/modules/tax-invoices/invoice-service';

export const GET = withAuth(async (_req: NextRequest, { principal }) => {
  try {
    const invoices = await getCustomerInvoices(principal.userId);
    return NextResponse.json({
      success: true,
      invoices,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to fetch tax invoices.';
    return NextResponse.json({ error: 'INVOICES_FETCH_FAILED', message }, { status: 500 });
  }
});
