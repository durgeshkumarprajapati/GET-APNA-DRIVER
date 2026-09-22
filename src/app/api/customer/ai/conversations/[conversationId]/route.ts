import { NextResponse } from 'next/server';
import { withPermission } from '@/modules/identity/authorization/route-guard';
import { PERMISSIONS } from '@/modules/identity/domain/permission-catalog';
import { prisma } from '@/shared/database/prisma';
import { toErrorResponse } from '@/shared/errors/app-error';

type RouteParams = { params: Promise<{ conversationId: string }> };

export const GET = withPermission<RouteParams>(
  PERMISSIONS.BOOKINGS_READ,
  async (_req, { principal }, routeContext) => {
    try {
      const { conversationId } = await routeContext!.params;
      const conversation = await prisma.aIConversation.findFirst({
        where: { id: conversationId, userId: principal.userId, role: 'CUSTOMER' },
        include: {
          messages: {
            orderBy: { createdAt: 'asc' },
          },
        },
      });

      if (!conversation) {
        return NextResponse.json({ error: 'CONVERSATION_NOT_FOUND' }, { status: 404 });
      }

      return NextResponse.json({ conversation }, { status: 200 });
    } catch (err: unknown) {
      return toErrorResponse(err, _req.nextUrl.pathname);
    }
  },
);
