import 'server-only';
import { NextResponse } from 'next/server';
import { withPermission } from '@/modules/identity/authorization/route-guard';
import { PERMISSIONS } from '@/modules/identity/domain/permission-catalog';
import { reconcileStuckPayments } from '@/modules/finance/application/services/payment-reconciliation-service';

export const POST = withPermission(PERMISSIONS.FINANCE_SETTLEMENT_MANAGE, async (req) => {
  let olderThanMinutes = 15;
  try {
    const body = (await req.json()) as { olderThanMinutes?: number };
    if (typeof body.olderThanMinutes === 'number' && body.olderThanMinutes > 0) {
      olderThanMinutes = body.olderThanMinutes;
    }
  } catch {
    // Body optional, fallback to default 15 mins
  }

  const reconciliation = await reconcileStuckPayments(olderThanMinutes);
  return NextResponse.json({ reconciliation }, { status: 200 });
});
