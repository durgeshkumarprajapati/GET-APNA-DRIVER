import 'server-only';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { withPermission } from '@/modules/identity/authorization/route-guard';
import { PERMISSIONS } from '@/modules/identity/domain/permission-catalog';
import { SupportTicketCategory, SupportTicketStatus } from '@prisma/client';
import {
  createSupportTicket,
  listCustomerTickets,
} from '@/modules/support/application/services/customer-support-service';
import { InvalidBookingAssociationError } from '@/modules/support/domain/errors';

const createTicketSchema = z.object({
  category: z.nativeEnum(SupportTicketCategory),
  subject: z.string().min(3).max(150),
  description: z.string().min(5).max(3000),
  bookingId: z.string().uuid().optional().nullable(),
});

export const POST = withPermission(
  PERMISSIONS.SUPPORT_TICKET_CREATE,
  async (req, { principal }) => {
    try {
      const body = await req.json();
      const parsed = createTicketSchema.parse(body);

      const ticket = await createSupportTicket({
        customerId: principal.userId,
        category: parsed.category,
        subject: parsed.subject,
        description: parsed.description,
        bookingId: parsed.bookingId,
      });

      return NextResponse.json({ success: true, data: ticket }, { status: 201 });
    } catch (err: unknown) {
      if (err instanceof z.ZodError) {
        return NextResponse.json(
          { error: 'VALIDATION_ERROR', message: 'Invalid input data', details: err.issues },
          { status: 400 },
        );
      }
      if (err instanceof InvalidBookingAssociationError) {
        return NextResponse.json(
          { error: 'INVALID_BOOKING', message: err.message },
          { status: 400 },
        );
      }
      const message = err instanceof Error ? err.message : 'Failed to create support ticket.';
      return NextResponse.json({ error: 'CREATE_FAILED', message }, { status: 500 });
    }
  },
);

export const GET = withPermission(PERMISSIONS.SUPPORT_TICKET_READ, async (req, { principal }) => {
  const { searchParams } = req.nextUrl;
  const statusParam = searchParams.get('status') as SupportTicketStatus | null;
  const page = parseInt(searchParams.get('page') || '1', 10);
  const pageSize = parseInt(searchParams.get('pageSize') || '20', 10);

  const result = await listCustomerTickets({
    customerId: principal.userId,
    status:
      statusParam && Object.values(SupportTicketStatus).includes(statusParam)
        ? statusParam
        : undefined,
    page,
    pageSize,
  });

  return NextResponse.json({ success: true, data: result });
});
