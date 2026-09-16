import { NextResponse } from 'next/server';
import { withPermission } from '@/modules/identity/authorization/route-guard';
import { PERMISSIONS } from '@/modules/identity/domain/permission-catalog';
import { prisma } from '@/shared/database/prisma';

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
      const message = err instanceof Error ? err.message : 'Failed to fetch conversation details.';
      return NextResponse.json({ error: 'FETCH_FAILED', message }, { status: 500 });
    }
  },
);
