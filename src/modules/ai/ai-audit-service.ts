import { prisma } from '@/shared/database/prisma';

export interface AIAuditLogInput {
  userId: string;
  role: string;
  intent: string;
  provider: string;
  model: string;
  latencyMs: number;
  success: boolean;
  actionType?: string;
  tokenUsage?: Record<string, unknown>;
  errorMessage?: string;
}

export class AIAuditService {
  async logEvent(input: AIAuditLogInput): Promise<void> {
    try {
      await prisma.aIAuditLog.create({
        data: {
          userId: input.userId,
          role: input.role,
          intent: input.intent,
          provider: input.provider,
          model: input.model,
          latencyMs: input.latencyMs,
          success: input.success,
          actionType: input.actionType || null,
          tokenUsage: input.tokenUsage ? JSON.parse(JSON.stringify(input.tokenUsage)) : null,
          errorMessage: input.errorMessage || null,
        },
      });
    } catch {
      // Non-blocking audit failure
    }
  }
}
