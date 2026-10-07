import 'server-only';
import { NextResponse } from 'next/server';
import { withPermission } from '@/modules/identity/authorization/route-guard';
import { PERMISSIONS } from '@/modules/identity/domain/permission-catalog';
import { getCustomerLifecycleStatus } from '@/modules/customer/application/services/customer-retention-engine-service';

export const GET = withPermission(PERMISSIONS.BOOKINGS_READ, async (_req, { principal }) => {
  const status = await getCustomerLifecycleStatus(principal.userId);
  return NextResponse.json(status, { status: 200 });
});
