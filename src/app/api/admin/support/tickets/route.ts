import 'server-only';
import { NextResponse } from 'next/server';
import { withPermission } from '@/modules/identity/authorization/route-guard';
import { PERMISSIONS } from '@/modules/identity/domain/permission-catalog';
import { SupportTicketCategory, SupportTicketStatus, SupportTicketPriority } from '@prisma/client';
import { listAdminSupportTickets } from '@/modules/support/application/services/admin-support-service';

export const GET = withPermission(PERMISSIONS.ADMIN_SUPPORT_MANAGE, async (req) => {
  const { searchParams } = req.nextUrl;
  const statusParam = searchParams.get('status') as SupportTicketStatus | null;
  const priorityParam = searchParams.get('priority') as SupportTicketPriority | null;
  const categoryParam = searchParams.get('category') as SupportTicketCategory | null;
  const assignedAdminId = searchParams.get('assignedAdminId') || undefined;
  const search = searchParams.get('search') || undefined;
  const page = parseInt(searchParams.get('page') || '1', 10);
  const pageSize = parseInt(searchParams.get('pageSize') || '20', 10);

  const result = await listAdminSupportTickets({
    status:
      statusParam && Object.values(SupportTicketStatus).includes(statusParam)
        ? statusParam
        : undefined,
    priority:
      priorityParam && Object.values(SupportTicketPriority).includes(priorityParam)
        ? priorityParam
        : undefined,
    category:
      categoryParam && Object.values(SupportTicketCategory).includes(categoryParam)
        ? categoryParam
        : undefined,
    assignedAdminId,
    search,
    page,
    pageSize,
  });

  return NextResponse.json({ success: true, data: result });
});
