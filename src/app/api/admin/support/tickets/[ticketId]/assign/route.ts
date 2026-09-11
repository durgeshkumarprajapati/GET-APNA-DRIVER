import 'server-only';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { withPermission } from '@/modules/identity/authorization/route-guard';
import { PERMISSIONS } from '@/modules/identity/domain/permission-catalog';
import { assignAdminTicket } from '@/modules/support/application/services/admin-support-service';
import {
  SupportTicketNotFoundError,
  SupportTicketAccessDeniedError,
} from '@/modules/support/domain/errors';

interface RouteParams {
  params: Promise<{ ticketId: string }>;
}

const assignSchema = z.object({
  assignedAdminId: z.string().uuid().nullable(),
});

export const PATCH = withPermission<RouteParams>(
  PERMISSIONS.ADMIN_SUPPORT_MANAGE,
  async (req, { principal }, routeContext) => {
    try {
      const { ticketId } = await routeContext!.params;
      const json = await req.json();
      const parsed = assignSchema.parse(json);

      const ticket = await assignAdminTicket({
        adminUserId: principal.userId,
        ticketId,
        assignedAdminId: parsed.assignedAdminId,
      });

      return NextResponse.json({ success: true, data: ticket });
    } catch (err: unknown) {
      if (err instanceof z.ZodError) {
        return NextResponse.json(
          { error: 'VALIDATION_ERROR', message: 'Invalid admin ID', details: err.issues },
          { status: 400 },
        );
      }
      if (err instanceof SupportTicketNotFoundError) {
        return NextResponse.json(
          { error: 'TICKET_NOT_FOUND', message: err.message },
          { status: 404 },
        );
      }
      if (err instanceof SupportTicketAccessDeniedError) {
        return NextResponse.json({ error: 'ACCESS_DENIED', message: err.message }, { status: 403 });
      }
      const message = err instanceof Error ? err.message : 'Failed to assign ticket operator.';
      return NextResponse.json({ error: 'ASSIGNMENT_FAILED', message }, { status: 500 });
    }
  },
);
