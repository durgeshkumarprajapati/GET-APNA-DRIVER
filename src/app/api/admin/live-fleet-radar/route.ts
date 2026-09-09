import 'server-only';
import { NextResponse } from 'next/server';
import { withPermission } from '@/modules/identity/authorization/route-guard';
import { PERMISSIONS } from '@/modules/identity/domain/permission-catalog';
import { listOnlineDriversForAdmin } from '@/modules/location/application/nearby-driver-service';

export const GET = withPermission(PERMISSIONS.ADMIN_DRIVER_READ, async () => {
  const drivers = await listOnlineDriversForAdmin();
  return NextResponse.json({ drivers }, { status: 200 });
});
