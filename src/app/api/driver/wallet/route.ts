import 'server-only';
import { NextResponse } from 'next/server';
import { withPermission } from '@/modules/identity/authorization/route-guard';
import { PERMISSIONS } from '@/modules/identity/domain/permission-catalog';
import { getOwnDriverWalletSummary } from '@/modules/finance/application/services/wallet-service';

export const GET = withPermission(PERMISSIONS.FINANCE_WALLET_READ, async (_req, { principal }) => {
  const wallet = await getOwnDriverWalletSummary(principal.userId);
  return NextResponse.json({ wallet }, { status: 200 });
});
