import 'server-only';
import { NextResponse } from 'next/server';
import { withPermission } from '@/modules/identity/authorization/route-guard';
import { PERMISSIONS } from '@/modules/identity/domain/permission-catalog';
import { listAdminScheduledRides } from '@/modules/scheduled-rides/application/scheduled-ride-service';

export const GET = withPermission(
  PERMISSIONS.ADMIN_SCHEDULED_RIDES_READ,
  async (req) => {
    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status') || undefined;
    const take = parseInt(searchParams.get('take') ?? '20', 10);
    const skip = parseInt(searchParams.get('skip') ?? '0', 10);

    const rides = await listAdminScheduledRides(status, take, skip);
    return NextResponse.json({ success: true, data: rides }, { status: 200 });
  },
);
