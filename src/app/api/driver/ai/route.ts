import { NextResponse } from 'next/server';
import { withPermission } from '@/modules/identity/authorization/route-guard';
import { PERMISSIONS } from '@/modules/identity/domain/permission-catalog';
import { AIService } from '@/modules/ai/ai-service';
import { prisma } from '@/shared/database/prisma';
import { z } from 'zod';

const MessageInputSchema = z.object({
  message: z.string().trim().min(1).max(1000),
  conversationId: z.string().uuid().optional(),
});

const aiService = new AIService();

export const POST = withPermission(
  PERMISSIONS.DRIVER_PROFILE_MANAGE,
  async (req, { principal }) => {
    try {
      const body = await req.json();
      const parsed = MessageInputSchema.safeParse(body);

      if (!parsed.success) {
        return NextResponse.json(
          { error: 'INVALID_INPUT', details: parsed.error.format() },
          { status: 400 }
        );
      }

      const response = await aiService.handleUserMessage({
        userId: principal.userId,
        role: 'DRIVER',
        message: parsed.data.message,
        conversationId: parsed.data.conversationId,
      });

      return NextResponse.json(response, { status: 200 });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to process Driver AI request.';
      return NextResponse.json({ error: 'AI_PROCESSING_FAILED', message }, { status: 500 });
    }
  }
);

export const GET = withPermission(
  PERMISSIONS.DRIVER_PROFILE_MANAGE,
  async (_req, { principal }) => {
    try {
      const conversations = await prisma.aIConversation.findMany({
        where: { userId: principal.userId, role: 'DRIVER' },
        orderBy: { updatedAt: 'desc' },
        take: 20,
      });
      return NextResponse.json({ conversations }, { status: 200 });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to fetch Driver AI conversations.';
      return NextResponse.json({ error: 'FETCH_FAILED', message }, { status: 500 });
    }
  }
);
