import 'server-only';
import { prisma, type Db } from '@/shared/database/prisma';
import {
  DriverIssueReportInput,
  DriverIssueReportResult,
} from '../../domain/driver-insights-types';
import { recordAuditLog } from '@/shared/audit/audit-service';
import { insertOutboxEvent } from '@/shared/outbox/outbox-service';

import { SupportTicketCategory, SupportTicketPriority } from '@prisma/client';

/**
 * Creates a formal issue report / support ticket for a driver.
 */
export async function reportDriverIssue(
  driverProfileId: string,
  userId: string,
  input: DriverIssueReportInput,
  db: Db = prisma,
): Promise<DriverIssueReportResult> {
  return await db.$transaction(async (tx) => {
    const title = `[Driver Issue] ${input.issueCategory.replace(/_/g, ' ')}`;

    let category: SupportTicketCategory = SupportTicketCategory.OTHER;
    if (input.issueCategory === 'FARE_DISPUTE') category = SupportTicketCategory.PAYMENT_FARE;
    else if (input.issueCategory === 'CUSTOMER_NO_SHOW') category = SupportTicketCategory.BOOKING_ISSUE;
    else if (input.issueCategory === 'APP_GLITCH' || input.issueCategory === 'ROUTE_PROBLEM') category = SupportTicketCategory.APP_TECHNICAL;

    const ticketNumber = `TICK-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
    const ticket = await tx.supportTicket.create({
      data: {
        ticketNumber,
        customerId: userId,
        subject: title,
        description: input.description,
        status: 'OPEN',
        priority: SupportTicketPriority.NORMAL,
        category,
        bookingId: input.bookingId ?? null,
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
      eventType: 'driver.issue.reported',
      aggregateType: 'SupportTicket',
      aggregateId: ticket.id,
      payload: {
        ticketId: ticket.id,
        driverProfileId,
        userId,
        issueCategory: input.issueCategory,
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
