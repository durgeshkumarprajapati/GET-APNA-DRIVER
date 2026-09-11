import 'server-only';
import { NextResponse } from 'next/server';
import { withPermission } from '@/modules/identity/authorization/route-guard';
import { PERMISSIONS } from '@/modules/identity/domain/permission-catalog';
import { getCustomerTicketDetail } from '@/modules/support/application/services/customer-support-service';
import {
  SupportTicketNotFoundError,
  SupportTicketAccessDeniedError,
} from '@/modules/support/domain/errors';

interface RouteParams {
  params: Promise<{ ticketId: string }>;
}

export const GET = withPermission<RouteParams>(
  PERMISSIONS.SUPPORT_TICKET_READ,
  async (_req, { principal }, routeContext) => {
    try {
      const { ticketId } = await routeContext!.params;
      const ticket = await getCustomerTicketDetail(ticketId, principal.userId);
      return NextResponse.json({ success: true, data: ticket });
    } catch (err: unknown) {
      if (err instanceof SupportTicketNotFoundError) {
        return NextResponse.json(
          { error: 'TICKET_NOT_FOUND', message: err.message },
          { status: 404 },
        );
      }
      if (err instanceof SupportTicketAccessDeniedError) {
        return NextResponse.json({ error: 'ACCESS_DENIED', message: err.message }, { status: 403 });
      }
      const message = err instanceof Error ? err.message : 'Failed to retrieve ticket details.';
      return NextResponse.json({ error: 'FETCH_FAILED', message }, { status: 500 });
    }
  },
);
