import { requireSessionForPage } from '@/shared/auth/require-session';
import UserNotificationsPage from '@/app/notifications/notifications-client';

export default async function DriverNotificationsPage() {
  await requireSessionForPage();
  return <UserNotificationsPage portal="DRIVER" />;
}
