import 'server-only';
import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/modules/identity/authorization/route-guard';
import { getCustomerInvoices } from '@/modules/tax-invoices/invoice-service';
import { toErrorResponse } from '@/shared/errors/app-error';

export const GET = withAuth(async (_req: NextRequest, { principal }) => {
  try {
    const invoices = await getCustomerInvoices(principal.userId);
    return NextResponse.json({
      success: true,
      invoices,
    });
  } catch (err: unknown) {
    return toErrorResponse(err, _req.nextUrl.pathname);
  }
});
