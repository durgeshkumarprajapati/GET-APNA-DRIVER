import 'server-only';
import { NextResponse } from 'next/server';
import { withPermission } from '@/modules/identity/authorization/route-guard';
import { PERMISSIONS } from '@/modules/identity/domain/permission-catalog';
import { listOwnDriverWalletTransactions } from '@/modules/finance/application/services/wallet-service';

export const GET = withPermission(PERMISSIONS.FINANCE_WALLET_READ, async (_req, { principal }) => {
  const transactions = await listOwnDriverWalletTransactions(principal.userId);
  return NextResponse.json({ transactions }, { status: 200 });
});
