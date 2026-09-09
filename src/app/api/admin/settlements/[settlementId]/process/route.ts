import 'server-only';
import { NextResponse } from 'next/server';
import { withPermission } from '@/modules/identity/authorization/route-guard';
import { PERMISSIONS } from '@/modules/identity/domain/permission-catalog';
import { startProcessingSettlement } from '@/modules/finance/application/services/settlement-service';

interface RouteParams {
  params: Promise<{ settlementId: string }>;
}

export const POST = withPermission<RouteParams>(
  PERMISSIONS.FINANCE_SETTLEMENT_MANAGE,
  async (_req, { principal }, routeContext) => {
    const { settlementId } = await routeContext!.params;
    const settlement = await startProcessingSettlement(principal.userId, settlementId);
    return NextResponse.json({ settlement }, { status: 200 });
  },
);
