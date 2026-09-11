import 'server-only';
import { NextResponse } from 'next/server';
import { withPermission } from '@/modules/identity/authorization/route-guard';
import { PERMISSIONS } from '@/modules/identity/domain/permission-catalog';
import { closeCustomerTicket } from '@/modules/support/application/services/customer-support-service';
import {
  SupportTicketNotFoundError,
  SupportTicketAccessDeniedError,
  InvalidSupportTicketStateTransitionError,
} from '@/modules/support/domain/errors';

interface RouteParams {
  params: Promise<{ ticketId: string }>;
}

export const POST = withPermission<RouteParams>(
  PERMISSIONS.SUPPORT_TICKET_CREATE,
  async (_req, { principal }, routeContext) => {
    try {
      const { ticketId } = await routeContext!.params;
      const result = await closeCustomerTicket(ticketId, principal.userId);
      return NextResponse.json({ success: true, data: result });
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
      if (err instanceof InvalidSupportTicketStateTransitionError) {
        return NextResponse.json(
          { error: 'INVALID_TRANSITION', message: err.message },
          { status: 400 },
        );
      }
      const message = err instanceof Error ? err.message : 'Failed to close ticket.';
      return NextResponse.json({ error: 'CLOSE_FAILED', message }, { status: 500 });
    }
  },
);
