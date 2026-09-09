import 'server-only';
import { NextResponse } from 'next/server';
import { withPermission } from '@/modules/identity/authorization/route-guard';
import { PERMISSIONS } from '@/modules/identity/domain/permission-catalog';
import { listAllPayments } from '@/modules/finance/application/services/payment-service';

export const GET = withPermission(PERMISSIONS.FINANCE_READ, async () => {
  const payments = await listAllPayments();
  return NextResponse.json({ payments }, { status: 200 });
});
