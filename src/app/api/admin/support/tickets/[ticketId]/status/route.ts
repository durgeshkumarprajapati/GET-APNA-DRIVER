import 'server-only';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { withPermission } from '@/modules/identity/authorization/route-guard';
import { PERMISSIONS } from '@/modules/identity/domain/permission-catalog';
import { SupportTicketStatus } from '@prisma/client';
import { updateAdminTicketStatus } from '@/modules/support/application/services/admin-support-service';
import {
  SupportTicketNotFoundError,
  InvalidSupportTicketStateTransitionError,
} from '@/modules/support/domain/errors';

interface RouteParams {
  params: Promise<{ ticketId: string }>;
}

const updateStatusSchema = z.object({
  status: z.nativeEnum(SupportTicketStatus),
});

export const PATCH = withPermission<RouteParams>(
  PERMISSIONS.ADMIN_SUPPORT_MANAGE,
  async (req, { principal }, routeContext) => {
    try {
      const { ticketId } = await routeContext!.params;
      const json = await req.json();
      const parsed = updateStatusSchema.parse(json);

      const ticket = await updateAdminTicketStatus({
        adminUserId: principal.userId,
        ticketId,
        status: parsed.status,
      });

      return NextResponse.json({ success: true, data: ticket });
    } catch (err: unknown) {
      if (err instanceof z.ZodError) {
        return NextResponse.json(
          { error: 'VALIDATION_ERROR', message: 'Invalid status value', details: err.issues },
          { status: 400 },
        );
      }
      if (err instanceof SupportTicketNotFoundError) {
        return NextResponse.json(
          { error: 'TICKET_NOT_FOUND', message: err.message },
          { status: 404 },
        );
      }
      if (err instanceof InvalidSupportTicketStateTransitionError) {
        return NextResponse.json(
          { error: 'INVALID_TRANSITION', message: err.message },
          { status: 400 },
        );
      }
      const message = err instanceof Error ? err.message : 'Failed to update ticket status.';
      return NextResponse.json({ error: 'UPDATE_FAILED', message }, { status: 500 });
    }
  },
);
