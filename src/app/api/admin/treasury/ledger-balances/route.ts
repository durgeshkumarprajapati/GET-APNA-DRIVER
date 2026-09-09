import 'server-only';
import { NextResponse } from 'next/server';
import { withPermission } from '@/modules/identity/authorization/route-guard';
import { PERMISSIONS } from '@/modules/identity/domain/permission-catalog';
import { getLedgerAccountBalances } from '@/modules/finance/application/services/treasury-service';

export const GET = withPermission(PERMISSIONS.FINANCE_READ, async () => {
  const accounts = await getLedgerAccountBalances();
  return NextResponse.json({ accounts }, { status: 200 });
});
