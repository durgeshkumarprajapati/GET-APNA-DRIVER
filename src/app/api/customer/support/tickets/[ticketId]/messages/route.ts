import 'server-only';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { withPermission } from '@/modules/identity/authorization/route-guard';
import { PERMISSIONS } from '@/modules/identity/domain/permission-catalog';
import { addCustomerMessage } from '@/modules/support/application/services/customer-support-service';
import {
  SupportTicketNotFoundError,
  SupportTicketAccessDeniedError,
  InvalidSupportTicketStateTransitionError,
} from '@/modules/support/domain/errors';

interface RouteParams {
  params: Promise<{ ticketId: string }>;
}

const addMessageSchema = z.object({
  body: z.string().min(1).max(3000),
});

export const POST = withPermission<RouteParams>(
  PERMISSIONS.SUPPORT_TICKET_CREATE,
  async (req, { principal }, routeContext) => {
    try {
      const { ticketId } = await routeContext!.params;
      const json = await req.json();
      const parsed = addMessageSchema.parse(json);

      const message = await addCustomerMessage({
        customerId: principal.userId,
        ticketId,
        body: parsed.body,
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
      if (err instanceof SupportTicketAccessDeniedError) {
        return NextResponse.json({ error: 'ACCESS_DENIED', message: err.message }, { status: 403 });
      }
      if (err instanceof InvalidSupportTicketStateTransitionError) {
        return NextResponse.json(
          { error: 'INVALID_TRANSITION', message: err.message },
          { status: 400 },
        );
      }
      const message = err instanceof Error ? err.message : 'Failed to post reply.';
      return NextResponse.json({ error: 'MESSAGE_FAILED', message }, { status: 500 });
    }
  },
);
