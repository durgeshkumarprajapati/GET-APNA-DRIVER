import 'server-only';
import { NextResponse } from 'next/server';
import { withPermission } from '@/modules/identity/authorization/route-guard';
import { PERMISSIONS } from '@/modules/identity/domain/permission-catalog';
import { getAdminTicketDetail } from '@/modules/support/application/services/admin-support-service';
import { SupportTicketNotFoundError } from '@/modules/support/domain/errors';

interface RouteParams {
  params: Promise<{ ticketId: string }>;
}

export const GET = withPermission<RouteParams>(
  PERMISSIONS.ADMIN_SUPPORT_MANAGE,
  async (_req, _context, routeContext) => {
    try {
      const { ticketId } = await routeContext!.params;
      const detail = await getAdminTicketDetail(ticketId);
      return NextResponse.json({ success: true, data: detail });
    } catch (err: unknown) {
      if (err instanceof SupportTicketNotFoundError) {
        return NextResponse.json(
          { error: 'TICKET_NOT_FOUND', message: err.message },
          { status: 404 },
        );
      }
      const message = err instanceof Error ? err.message : 'Failed to fetch admin ticket detail.';
      return NextResponse.json({ error: 'FETCH_FAILED', message }, { status: 500 });
    }
  },
);
