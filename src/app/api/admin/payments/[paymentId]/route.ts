import 'server-only';
import { NextResponse } from 'next/server';
import { withPermission } from '@/modules/identity/authorization/route-guard';
import { PERMISSIONS } from '@/modules/identity/domain/permission-catalog';
import { getPaymentByIdForAdmin } from '@/modules/finance/application/services/payment-service';

interface RouteParams {
  params: Promise<{ paymentId: string }>;
}

export const GET = withPermission<RouteParams>(
  PERMISSIONS.FINANCE_READ,
  async (_req, _context, routeContext) => {
    const { paymentId } = await routeContext!.params;
    const payment = await getPaymentByIdForAdmin(paymentId);
    return NextResponse.json({ payment }, { status: 200 });
  },
);
