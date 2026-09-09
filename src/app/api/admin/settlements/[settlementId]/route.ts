import 'server-only';
import { NextResponse } from 'next/server';
import { withPermission } from '@/modules/identity/authorization/route-guard';
import { PERMISSIONS } from '@/modules/identity/domain/permission-catalog';
import { getSettlementById } from '@/modules/finance/application/services/settlement-service';
import { listAuditLogs } from '@/shared/audit/audit-service';

interface RouteParams {
  params: Promise<{ settlementId: string }>;
}

export const GET = withPermission<RouteParams>(
  PERMISSIONS.FINANCE_SETTLEMENT_MANAGE,
  async (_req, _context, routeContext) => {
    const { settlementId } = await routeContext!.params;
    const settlement = await getSettlementById(settlementId);
    const auditTrail = await listAuditLogs({
      entityType: 'DriverSettlement',
      entityId: settlementId,
      pageSize: 100,
    });
    return NextResponse.json({ settlement, auditTrail: auditTrail.entries }, { status: 200 });
  },
);
