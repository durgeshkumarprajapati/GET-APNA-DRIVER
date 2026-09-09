import 'server-only';
import { NextResponse } from 'next/server';
import { withPermission } from '@/modules/identity/authorization/route-guard';
import { PERMISSIONS } from '@/modules/identity/domain/permission-catalog';
import { listOwnDriverSettlements } from '@/modules/finance/application/services/settlement-service';

export const GET = withPermission(PERMISSIONS.FINANCE_WALLET_READ, async (_req, { principal }) => {
  const settlements = await listOwnDriverSettlements(principal.userId);
  return NextResponse.json({ settlements }, { status: 200 });
});
