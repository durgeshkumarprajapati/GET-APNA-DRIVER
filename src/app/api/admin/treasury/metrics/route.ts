import 'server-only';
import { NextResponse } from 'next/server';
import { withPermission } from '@/modules/identity/authorization/route-guard';
import { PERMISSIONS } from '@/modules/identity/domain/permission-catalog';
import { getTreasuryMetrics } from '@/modules/finance/application/services/treasury-service';

export const GET = withPermission(PERMISSIONS.FINANCE_READ, async () => {
  const metrics = await getTreasuryMetrics();
  return NextResponse.json({ metrics }, { status: 200 });
});
