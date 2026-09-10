jest.mock('@/shared/database/prisma', () => ({
  prisma: {
    driverProfile: { findUnique: jest.fn() },
  },
}));

import { resolveDashboardHref } from '@/modules/identity/application/services/dashboard-redirect-service';
import { prisma } from '@/shared/database/prisma';
import { SYSTEM_ROLE_CODES } from '@/modules/identity/domain/role-catalog';

const mockedFindUnique = prisma.driverProfile.findUnique as jest.Mock;

describe('resolveDashboardHref', () => {
  afterEach(() => jest.clearAllMocks());

  it('sends an administrator to the mission dashboard regardless of other roles', async () => {
    const href = await resolveDashboardHref(
      [SYSTEM_ROLE_CODES.ADMINISTRATOR, SYSTEM_ROLE_CODES.CUSTOMER],
      'user-1',
    );
    expect(href).toBe('/admin/mission-dashboard');
    expect(mockedFindUnique).not.toHaveBeenCalled();
  });

  it('sends a customer to the customer dashboard', async () => {
    const href = await resolveDashboardHref([SYSTEM_ROLE_CODES.CUSTOMER], 'user-1');
    expect(href).toBe('/customer/dashboard');
  });

  it('sends a driver who has completed onboarding to the driver dashboard', async () => {
    mockedFindUnique.mockResolvedValue({ onboardingStatus: 'COMPLETED' });
    const href = await resolveDashboardHref([SYSTEM_ROLE_CODES.DRIVER], 'user-1');
    expect(href).toBe('/driver');
  });

  it('sends a driver who has not completed onboarding to /driver/onboarding', async () => {
    mockedFindUnique.mockResolvedValue({ onboardingStatus: 'IN_PROGRESS' });
    const href = await resolveDashboardHref([SYSTEM_ROLE_CODES.DRIVER], 'user-1');
    expect(href).toBe('/driver/onboarding');
  });

  it('sends a driver with no profile row at all to /driver (nothing to redirect on)', async () => {
    mockedFindUnique.mockResolvedValue(null);
    const href = await resolveDashboardHref([SYSTEM_ROLE_CODES.DRIVER], 'user-1');
    expect(href).toBe('/driver');
  });

  it.each(['NOT_STARTED', 'SUBMITTED', 'UNDER_REVIEW', 'CHANGES_REQUESTED'])(
    'sends a driver with onboardingStatus %s to /driver/onboarding',
    async (status) => {
      mockedFindUnique.mockResolvedValue({ onboardingStatus: status });
      const href = await resolveDashboardHref([SYSTEM_ROLE_CODES.DRIVER], 'user-1');
      expect(href).toBe('/driver/onboarding');
    },
  );
});
