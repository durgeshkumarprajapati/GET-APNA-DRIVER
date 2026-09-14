import 'server-only';
import { NextRequest, NextResponse } from 'next/server';
import { withPermission } from '@/modules/identity/authorization/route-guard';
import { PERMISSIONS } from '@/modules/identity/domain/permission-catalog';
import { getAdminInvoices } from '@/modules/tax-invoices/invoice-service';
import { TaxInvoiceStatus } from '@prisma/client';

export const GET = withPermission(PERMISSIONS.ADMIN_DASHBOARD_READ, async (req: NextRequest) => {
  try {
    const { searchParams } = req.nextUrl;
    const page = parseInt(searchParams.get('page') || '1', 10);
    const pageSize = parseInt(searchParams.get('pageSize') || '20', 10);
    const statusParam = searchParams.get('status');

    let statusFilter: TaxInvoiceStatus | undefined = undefined;
    if (statusParam && Object.values(TaxInvoiceStatus).includes(statusParam as TaxInvoiceStatus)) {
      statusFilter = statusParam as TaxInvoiceStatus;
    }

    const result = await getAdminInvoices(page, pageSize, statusFilter);
    return NextResponse.json({
      success: true,
      ...result,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to fetch tax invoices.';
    return NextResponse.json({ error: 'ADMIN_INVOICES_FETCH_FAILED', message }, { status: 500 });
  }
});
