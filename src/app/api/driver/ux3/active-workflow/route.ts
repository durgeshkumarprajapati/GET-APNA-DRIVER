import 'server-only';
import { NextResponse } from 'next/server';
import { withPermission } from '@/modules/identity/authorization/route-guard';
import { PERMISSIONS } from '@/modules/identity/domain/permission-catalog';
import { getDriverUX3ActiveWorkflow } from '@/modules/driver/application/services/driver-ux3-service';

export const GET = withPermission(
  PERMISSIONS.BOOKINGS_READ,
  async (_req, { principal }) => {
    const workflow = await getDriverUX3ActiveWorkflow(principal.userId);
    return NextResponse.json(workflow, { status: 200 });
  },
);
