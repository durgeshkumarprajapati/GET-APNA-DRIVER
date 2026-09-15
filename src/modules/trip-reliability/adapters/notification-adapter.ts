import { prisma } from '@/shared/database/prisma';

export class NotificationAdapter {
  async sendReliabilityNotification(input: {
    userId: string;
    title: string;
    message: string;
    category: string;
    metadata?: Record<string, unknown>;
  }): Promise<boolean> {
    try {
      await prisma.notification.create({
        data: {
          userId: input.userId,
          title: input.title,
          body: input.message,
          type: 'SYSTEM_ANNOUNCEMENT',
          category: input.category,
          data: input.metadata ? JSON.parse(JSON.stringify(input.metadata)) : undefined,
        },
      });
      return true;
    } catch {
      return false;
    }
  }
}
