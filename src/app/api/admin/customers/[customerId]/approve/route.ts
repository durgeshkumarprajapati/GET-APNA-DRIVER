import 'server-only';
import { NextResponse } from 'next/server';
import { withPermission } from '@/modules/identity/authorization/route-guard';
import { PERMISSIONS } from '@/modules/identity/domain/permission-catalog';
import {
  approveCustomer,
  CustomerNotFoundError,
  InvalidCustomerStatusError,
} from '@/modules/customer/application/customer-approval-service';

interface RouteParams {
  params: Promise<{ customerId: string }>;
}

export const POST = withPermission<RouteParams>(
  PERMISSIONS.ADMIN_CUSTOMER_APPROVE,
  async (_req, { principal }, routeContext) => {
    try {
      const { customerId } = await routeContext!.params;
      const result = await approveCustomer({ customerId, actor: principal });
      return NextResponse.json(
        {
          success: true,
          data: result,
          message: 'Customer has been successfully approved.',
        },
        { status: 200 },
      );
    } catch (err: unknown) {
      if (err instanceof CustomerNotFoundError) {
        return NextResponse.json(
          { error: 'CUSTOMER_NOT_FOUND', message: err.message },
          { status: 404 },
        );
      }
      if (err instanceof InvalidCustomerStatusError) {
        return NextResponse.json(
          { error: 'INVALID_STATUS', message: err.message },
          { status: 400 },
        );
      }
      const message = err instanceof Error ? err.message : 'Failed to approve customer.';
      return NextResponse.json({ error: 'APPROVAL_FAILED', message }, { status: 500 });
    }
  },
);
