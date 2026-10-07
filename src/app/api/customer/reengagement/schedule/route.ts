import 'server-only';
import { NextResponse } from 'next/server';
import { withPermission } from '@/modules/identity/authorization/route-guard';
import { PERMISSIONS } from '@/modules/identity/domain/permission-catalog';
import { getCustomerReengagementSchedule } from '@/modules/customer/application/services/customer-reengagement-service';

export const GET = withPermission(
  PERMISSIONS.ADMIN_PLATFORM_METRICS_READ,
  async (_req) => {
    const schedule = await getCustomerReengagementSchedule();
    return NextResponse.json(schedule, { status: 200 });
  },
);
