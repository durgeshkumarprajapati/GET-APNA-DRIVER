import 'server-only';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { withPermission } from '@/modules/identity/authorization/route-guard';
import { PERMISSIONS } from '@/modules/identity/domain/permission-catalog';
import { addAdminMessage } from '@/modules/support/application/services/admin-support-service';
import { SupportTicketNotFoundError } from '@/modules/support/domain/errors';

interface RouteParams {
  params: Promise<{ ticketId: string }>;
}

const adminMessageSchema = z.object({
  body: z.string().min(1).max(3000),
  isInternalNote: z.boolean().optional().default(false),
});

export const POST = withPermission<RouteParams>(
  PERMISSIONS.ADMIN_SUPPORT_RESPOND,
  async (req, { principal }, routeContext) => {
    try {
      const { ticketId } = await routeContext!.params;
      const json = await req.json();
      const parsed = adminMessageSchema.parse(json);

      const message = await addAdminMessage({
        adminUserId: principal.userId,
        ticketId,
        body: parsed.body,
        isInternalNote: parsed.isInternalNote,
      });

      return NextResponse.json({ success: true, data: message }, { status: 201 });
    } catch (err: unknown) {
      if (err instanceof z.ZodError) {
        return NextResponse.json(
          { error: 'VALIDATION_ERROR', message: 'Invalid message content', details: err.issues },
          { status: 400 },
        );
      }
      if (err instanceof SupportTicketNotFoundError) {
        return NextResponse.json(
          { error: 'TICKET_NOT_FOUND', message: err.message },
          { status: 404 },
        );
      }
      const message = err instanceof Error ? err.message : 'Failed to post admin response.';
      return NextResponse.json({ error: 'MESSAGE_FAILED', message }, { status: 500 });
    }
  },
);
