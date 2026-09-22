import { NotificationType } from '@prisma/client';
import { createNotification } from '@/modules/notification/application/notification-service';
import type { NotificationCategory } from '@/modules/notification/application/notification-preference-service';

export class NotificationAdapter {
  /**
   * Routes through the shared createNotification (not a raw
   * prisma.notification.create) so reliability/incident alerts get the
   * same treatment as every other notification in the app: the user's
   * category opt-out preference is respected, an IN_APP delivery record is
   * written, and — when the category/preference allow it — a Web Push
   * attempt is made. The previous raw-insert version silently skipped all
   * of that for this one notification path.
   */
  async sendReliabilityNotification(input: {
    userId: string;
    title: string;
    message: string;
    category: NotificationCategory;
    metadata?: Record<string, unknown>;
  }): Promise<boolean> {
    try {
      await createNotification({
        userId: input.userId,
        type: NotificationType.SYSTEM_ANNOUNCEMENT,
        title: input.title,
        body: input.message,
        category: input.category,
        data: input.metadata,
      });
      return true;
    } catch {
      return false;
    }
  }
}
