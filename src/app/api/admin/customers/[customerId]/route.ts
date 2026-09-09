import 'server-only';
import { NextResponse } from 'next/server';
import { withPermission } from '@/modules/identity/authorization/route-guard';
import { PERMISSIONS } from '@/modules/identity/domain/permission-catalog';
import { getCustomerAdminDetail } from '@/modules/customer/application/customer-admin-service';

interface RouteParams {
  params: Promise<{ customerId: string }>;
}

export const GET = withPermission<RouteParams>(
  PERMISSIONS.ADMIN_CUSTOMER_READ,
  async (_req, _context, routeContext) => {
    const { customerId } = await routeContext!.params;
    const customer = await getCustomerAdminDetail(customerId);

    if (!customer) {
      return NextResponse.json(
        { error: { code: 'NOT_FOUND', message: 'Customer not found.' } },
        { status: 404 },
      );
    }

    return NextResponse.json({ customer }, { status: 200 });
  },
);
