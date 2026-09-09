import 'server-only';
import { NextResponse } from 'next/server';
import { withPermission } from '@/modules/identity/authorization/route-guard';
import { PERMISSIONS } from '@/modules/identity/domain/permission-catalog';
import { getPaymentById } from '@/modules/finance/application/services/payment-service';

interface RouteParams {
  params: Promise<{ paymentId: string }>;
}

export const GET = withPermission<RouteParams>(
  PERMISSIONS.PAYMENTS_READ,
  async (_req, { principal }, routeContext) => {
    const { paymentId } = await routeContext!.params;
    const payment = await getPaymentById(principal.userId, paymentId);
    return NextResponse.json({ payment }, { status: 200 });
  },
);
