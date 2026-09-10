jest.mock('@/shared/auth/require-session', () => ({
  requireSessionForPage: jest.fn(),
}));

import NotificationsRoute from '@/app/notifications/page';
import { requireSessionForPage } from '@/shared/auth/require-session';

const mockedRequireSession = requireSessionForPage as jest.Mock;

/**
 * /notifications is rendered inside CustomerLayout, DriverLayout, or
 * AdminLayout — every one of those layouts links here (via
 * NotificationCenter), so the wrong choice would show a Customer the
 * Driver/Admin shell (or vice versa). This tests only the pure
 * role -> portal derivation in the server wrapper, not the client
 * component's rendering (this codebase has no React component-testing
 * infrastructure — see the Known Limitations section of the delivery
 * report).
 */
describe('NotificationsRoute — role-to-portal derivation', () => {
  async function renderPortalFor(roles: string[]) {
    mockedRequireSession.mockResolvedValue({
      userId: 'user-1',
      accountStatus: 'ACTIVE',
      roles,
      permissions: [],
    });
    const element = await NotificationsRoute();
    return (element.props as { portal: string }).portal;
  }

  it('resolves ADMIN for an administrator, even if they also hold other roles', async () => {
    await expect(renderPortalFor(['ADMINISTRATOR', 'CUSTOMER'])).resolves.toBe('ADMIN');
  });

  it('resolves DRIVER for a driver', async () => {
    await expect(renderPortalFor(['DRIVER'])).resolves.toBe('DRIVER');
  });

  it('resolves CUSTOMER for a customer', async () => {
    await expect(renderPortalFor(['CUSTOMER'])).resolves.toBe('CUSTOMER');
  });

  it('defaults to CUSTOMER when the principal has no recognized role', async () => {
    await expect(renderPortalFor([])).resolves.toBe('CUSTOMER');
  });
});
