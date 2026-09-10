jest.mock('@/shared/database/prisma', () => ({
  prisma: {
    customerProfile: { findUnique: jest.fn(), create: jest.fn() },
    driverProfile: { findUnique: jest.fn(), create: jest.fn() },
  },
}));

import { evaluateProfileCompletion } from '@/modules/identity/application/services/profile-completion-service';
import { prisma } from '@/shared/database/prisma';
import { SYSTEM_ROLE_CODES } from '@/modules/identity/domain/role-catalog';

const mockedCustomerFind = prisma.customerProfile.findUnique as jest.Mock;
const mockedCustomerCreate = prisma.customerProfile.create as jest.Mock;
const mockedDriverFind = prisma.driverProfile.findUnique as jest.Mock;
const mockedDriverCreate = prisma.driverProfile.create as jest.Mock;

describe('evaluateProfileCompletion', () => {
  afterEach(() => jest.clearAllMocks());

  it('an administrator is always complete, regardless of any profile row', async () => {
    const result = await evaluateProfileCompletion([SYSTEM_ROLE_CODES.ADMINISTRATOR], 'user-1');
    expect(result).toEqual({
      isComplete: true,
      role: 'ADMINISTRATOR',
      missingFields: [],
      nextPath: '/admin/mission-dashboard',
    });
    expect(mockedCustomerFind).not.toHaveBeenCalled();
    expect(mockedDriverFind).not.toHaveBeenCalled();
  });

  describe('CUSTOMER', () => {
    it('is complete when firstName and lastName are both set', async () => {
      mockedCustomerFind.mockResolvedValue({ firstName: 'Asha', lastName: 'Rao' });
      const result = await evaluateProfileCompletion([SYSTEM_ROLE_CODES.CUSTOMER], 'user-1');
      expect(result).toEqual({
        isComplete: true,
        role: 'CUSTOMER',
        missingFields: [],
        nextPath: '/customer/dashboard',
      });
    });

    it('is incomplete when the profile has no row yet (auto-created empty)', async () => {
      mockedCustomerFind.mockResolvedValue(null);
      mockedCustomerCreate.mockResolvedValue({ firstName: null, lastName: null });
      const result = await evaluateProfileCompletion([SYSTEM_ROLE_CODES.CUSTOMER], 'user-1');
      expect(result.isComplete).toBe(false);
      expect(result.role).toBe('CUSTOMER');
      expect(result.missingFields).toEqual(expect.arrayContaining(['firstName', 'lastName']));
      expect(result.nextPath).toBe('/profile');
    });

    it('is incomplete when only lastName is missing', async () => {
      mockedCustomerFind.mockResolvedValue({ firstName: 'Asha', lastName: '' });
      const result = await evaluateProfileCompletion([SYSTEM_ROLE_CODES.CUSTOMER], 'user-1');
      expect(result.isComplete).toBe(false);
      expect(result.missingFields).toEqual(['lastName']);
      expect(result.nextPath).toBe('/profile');
    });
  });

  describe('DRIVER', () => {
    it('is complete when name fields are set and onboarding is COMPLETED', async () => {
      mockedDriverFind.mockResolvedValue({
        firstName: 'Ravi',
        lastName: 'Kumar',
        onboardingStatus: 'COMPLETED',
      });
      const result = await evaluateProfileCompletion([SYSTEM_ROLE_CODES.DRIVER], 'user-1');
      expect(result).toEqual({
        isComplete: true,
        role: 'DRIVER',
        missingFields: [],
        nextPath: '/driver',
      });
    });

    it('is incomplete when onboarding is not COMPLETED, even with a full name', async () => {
      mockedDriverFind.mockResolvedValue({
        firstName: 'Ravi',
        lastName: 'Kumar',
        onboardingStatus: 'UNDER_REVIEW',
      });
      const result = await evaluateProfileCompletion([SYSTEM_ROLE_CODES.DRIVER], 'user-1');
      expect(result.isComplete).toBe(false);
      expect(result.missingFields).toEqual(['onboarding']);
      expect(result.nextPath).toBe('/driver/onboarding');
    });

    it('is incomplete for a brand-new driver profile with no name and NOT_STARTED onboarding', async () => {
      mockedDriverFind.mockResolvedValue(null);
      mockedDriverCreate.mockResolvedValue({
        firstName: null,
        lastName: null,
        onboardingStatus: 'NOT_STARTED',
      });
      const result = await evaluateProfileCompletion([SYSTEM_ROLE_CODES.DRIVER], 'user-1');
      expect(result.isComplete).toBe(false);
      expect(result.missingFields).toEqual(
        expect.arrayContaining(['firstName', 'lastName', 'onboarding']),
      );
      expect(result.nextPath).toBe('/driver/onboarding');
    });
  });

  it('a session with no role at all is routed to explicit role selection', async () => {
    const result = await evaluateProfileCompletion([], 'user-1');
    expect(result).toEqual({
      isComplete: false,
      role: null,
      missingFields: ['role'],
      nextPath: '/auth/select-role',
    });
    expect(mockedCustomerFind).not.toHaveBeenCalled();
    expect(mockedDriverFind).not.toHaveBeenCalled();
  });

  it('administrator role wins over any other role present', async () => {
    const result = await evaluateProfileCompletion(
      [SYSTEM_ROLE_CODES.CUSTOMER, SYSTEM_ROLE_CODES.ADMINISTRATOR],
      'user-1',
    );
    expect(result.role).toBe('ADMINISTRATOR');
    expect(result.nextPath).toBe('/admin/mission-dashboard');
  });
});
