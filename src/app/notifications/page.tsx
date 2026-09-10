import { requireSessionForPage } from '@/shared/auth/require-session';
import UserNotificationsPage from './notifications-client';

export default async function NotificationsRoute() {
  await requireSessionForPage();
  return <UserNotificationsPage />;
}
