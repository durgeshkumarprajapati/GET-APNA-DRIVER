jest.mock('@/modules/identity/application/services/profile-completion-service', () => ({
  evaluateProfileCompletion: jest.fn(),
}));

import { resolveDashboardHref } from '@/modules/identity/application/services/dashboard-redirect-service';
import { evaluateProfileCompletion } from '@/modules/identity/application/services/profile-completion-service';
import { SYSTEM_ROLE_CODES } from '@/modules/identity/domain/role-catalog';

const mockedEvaluate = evaluateProfileCompletion as jest.Mock;

describe('resolveDashboardHref', () => {
  afterEach(() => jest.clearAllMocks());

  it('is a thin passthrough to evaluateProfileCompletion.nextPath — the detailed completeness matrix lives in profile-completion-service.spec.ts', async () => {
    mockedEvaluate.mockResolvedValue({
      isComplete: true,
      role: 'CUSTOMER',
      missingFields: [],
      nextPath: '/customer/dashboard',
    });

    const href = await resolveDashboardHref([SYSTEM_ROLE_CODES.CUSTOMER], 'user-1');

    expect(href).toBe('/customer/dashboard');
    expect(mockedEvaluate).toHaveBeenCalledWith(
      [SYSTEM_ROLE_CODES.CUSTOMER],
      'user-1',
      expect.anything(),
    );
  });

  it('forwards whatever nextPath evaluateProfileCompletion returns, unchanged', async () => {
    mockedEvaluate.mockResolvedValue({
      isComplete: false,
      role: null,
      missingFields: ['role'],
      nextPath: '/auth/select-role',
    });

    const href = await resolveDashboardHref([], 'user-2');

    expect(href).toBe('/auth/select-role');
  });
});
