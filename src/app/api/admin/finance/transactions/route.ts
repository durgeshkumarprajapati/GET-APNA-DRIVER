import 'server-only';
import { NextResponse } from 'next/server';
import { withPermission } from '@/modules/identity/authorization/route-guard';
import { PERMISSIONS } from '@/modules/identity/domain/permission-catalog';
import { listFinancialTransactions } from '@/modules/finance/application/services/ledger-service';

export const GET = withPermission(PERMISSIONS.FINANCE_READ, async () => {
  const transactions = await listFinancialTransactions();
  return NextResponse.json({ transactions }, { status: 200 });
});
