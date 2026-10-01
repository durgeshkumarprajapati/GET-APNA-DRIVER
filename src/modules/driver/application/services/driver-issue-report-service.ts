import 'server-only';
import { prisma, type Db } from '@/shared/database/prisma';
import {
  DriverIssueReportInput,
  DriverIssueReportResult,
} from '../../domain/driver-insights-types';
import { recordAuditLog } from '@/shared/audit/audit-service';
import { insertOutboxEvent } from '@/shared/outbox/outbox-service';
import { generateTicketNumber } from '@/modules/support/application/services/customer-support-service';
import { BookingNotFoundError } from '@/modules/booking/domain/errors';

import { SupportTicketCategory, SupportTicketAuthorRole, SupportTicketPriority } from '@prisma/client';

/**
 * Creates a formal issue report / support ticket for a driver. Reuses the
 * same ticket-numbering scheme and outbox event
 * (support.ticket_created — see support-event-handlers.ts, which sends the
 * "request received" confirmation off it) as the customer-facing
 * createSupportTicket, rather than a second, inconsistent ticket format
 * nothing else in the system recognizes.
 */
export async function reportDriverIssue(
  driverProfileId: string,
  userId: string,
  input: DriverIssueReportInput,
  db: Db = prisma,
): Promise<DriverIssueReportResult> {
  // A booking referenced in the report must actually belong to this driver
  // — without this check, any driver could attach any other driver's
  // booking to their own ticket.
  if (input.bookingId) {
    const booking = await db.booking.findUnique({
      where: { id: input.bookingId },
      select: { driverProfileId: true },
    });
    if (!booking || booking.driverProfileId !== driverProfileId) {
      throw new BookingNotFoundError(input.bookingId);
    }
  }

  return await db.$transaction(async (tx) => {
    const title = `[Driver Issue] ${input.issueCategory.replace(/_/g, ' ')}`;

    let category: SupportTicketCategory = SupportTicketCategory.OTHER;
    if (input.issueCategory === 'FARE_DISPUTE') category = SupportTicketCategory.PAYMENT_FARE;
    else if (input.issueCategory === 'CUSTOMER_NO_SHOW') category = SupportTicketCategory.BOOKING_ISSUE;
    else if (input.issueCategory === 'APP_GLITCH' || input.issueCategory === 'ROUTE_PROBLEM') category = SupportTicketCategory.APP_TECHNICAL;

    const ticketNumber = await generateTicketNumber(tx);
    const ticket = await tx.supportTicket.create({
      data: {
        ticketNumber,
        // SupportTicket.customerId is a generic "submitting user" field —
        // the existing customer-facing flow is just the only caller that's
        // used it so far; a driver's own userId belongs here the same way.
        customerId: userId,
        subject: title,
        description: input.description,
        status: 'OPEN',
        priority: SupportTicketPriority.NORMAL,
        category,
        bookingId: input.bookingId ?? null,
        messages: {
          create: {
            authorUserId: userId,
            authorRole: SupportTicketAuthorRole.DRIVER,
            isInternalNote: false,
            body: input.description,
          },
        },
      },
    });

    await recordAuditLog(tx, {
      actorUserId: userId,
      action: 'driver.issue.reported',
      entityType: 'SupportTicket',
      entityId: ticket.id,
      afterState: {
        ticketId: ticket.id,
        issueCategory: input.issueCategory,
        bookingId: input.bookingId,
      },
    });

    await insertOutboxEvent(tx, {
      eventType: 'support.ticket_created',
      aggregateType: 'SupportTicket',
      aggregateId: ticket.id,
      payload: {
        ticketId: ticket.id,
        ticketNumber: ticket.ticketNumber,
        customerId: userId,
        category: ticket.category,
        subject: ticket.subject,
      },
    });

    return {
      ticketId: ticket.id,
      driverProfileId,
      issueCategory: input.issueCategory,
      status: 'OPEN',
      createdAt: ticket.createdAt.toISOString(),
    };
  });
}
