import { requireSessionForPage } from '@/shared/auth/require-session';
import { SYSTEM_ROLE_CODES } from '@/modules/identity/domain/role-catalog';
import UserNotificationsPage from './notifications-client';

/**
 * /notifications is genuinely shared across all three portals — every one
 * of CustomerLayout, DriverLayout, and AdminLayout renders NotificationCenter
 * linking here — so the shell choice must follow the caller's actual role
 * rather than hardcoding one portal's layout.
 */
export default async function NotificationsRoute() {
  const principal = await requireSessionForPage();
  const portal = principal.roles.includes(SYSTEM_ROLE_CODES.ADMINISTRATOR)
    ? 'ADMIN'
    : principal.roles.includes(SYSTEM_ROLE_CODES.DRIVER)
      ? 'DRIVER'
      : 'CUSTOMER';
  return <UserNotificationsPage portal={portal} />;
}
