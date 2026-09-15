import { NotificationAdapter } from '../adapters/notification-adapter';
import type { RecoveryResult } from '../trip-reliability-types';

export class NotificationRecoveryHandler {
  private notificationAdapter = new NotificationAdapter();

  async recoverNotificationFailure(userId: string, title: string, message: string): Promise<RecoveryResult> {
    const success = await this.notificationAdapter.sendReliabilityNotification({
      userId,
      title,
      message,
      category: 'RELIABILITY_ALERT',
    });

    return {
      success,
      actionTaken: success ? 'RETRY_NOTIFICATION_SENT' : 'RETRY_NOTIFICATION_FAILED',
      notes: success ? 'Idempotent notification retry succeeded.' : 'Notification retry failed.',
    };
  }
}
