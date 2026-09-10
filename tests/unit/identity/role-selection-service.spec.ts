jest.mock('@/shared/database/prisma', () => ({
  prisma: {
    $transaction: jest.fn((cb: (tx: unknown) => unknown) => cb(mockTx)),
  },
}));

jest.mock('@/shared/audit/audit-service', () => ({ recordAuditLog: jest.fn() }));

jest.mock('@/modules/customer/application/customer-profile-service', () => ({
  getOrCreateCustomerProfile: jest.fn(),
  updateCustomerProfile: jest.fn(),
}));

jest.mock('@/modules/driver/application/services/driver-profile-service', () => ({
  getOrCreateDriverProfile: jest.fn(),
  updateDriverProfile: jest.fn(),
}));

jest.mock('@/modules/identity/infrastructure/rbac-repository', () => ({
  findRoleByCode: jest.fn(),
  upsertRoleAssignment: jest.fn(),
}));

jest.mock('@/modules/identity/application/services/profile-completion-service', () => ({
  evaluateProfileCompletion: jest.fn(),
}));

const mockTx = {
  userRole: { findMany: jest.fn() },
};

import { selectRoleForUser } from '@/modules/identity/application/services/role-selection-service';
import * as rbacRepository from '@/modules/identity/infrastructure/rbac-repository';
import {
  getOrCreateCustomerProfile,
  updateCustomerProfile,
} from '@/modules/customer/application/customer-profile-service';
import {
  getOrCreateDriverProfile,
  updateDriverProfile,
} from '@/modules/driver/application/services/driver-profile-service';
import { evaluateProfileCompletion } from '@/modules/identity/application/services/profile-completion-service';
import {
  InvalidRoleSelectionError,
  RoleAlreadyAssignedError,
} from '@/modules/identity/domain/errors';

const mockedFindRoleByCode = rbacRepository.findRoleByCode as jest.Mock;
const mockedUpsertRoleAssignment = rbacRepository.upsertRoleAssignment as jest.Mock;
const mockedEvaluate = evaluateProfileCompletion as jest.Mock;

describe('selectRoleForUser', () => {
  afterEach(() => jest.clearAllMocks());

  it('rejects a role other than CUSTOMER or DRIVER (e.g. ADMINISTRATOR)', async () => {
    await expect(selectRoleForUser('user-1', 'ADMINISTRATOR', null)).rejects.toThrow(
      InvalidRoleSelectionError,
    );
    expect(mockTx.userRole.findMany).not.toHaveBeenCalled();
  });

  it('rejects a nonsense role string', async () => {
    await expect(selectRoleForUser('user-1', 'SUPERUSER', null)).rejects.toThrow(
      InvalidRoleSelectionError,
    );
  });

  it('rejects selection when the account already has a role (tamper/replay guard)', async () => {
    mockTx.userRole.findMany.mockResolvedValue([{ id: 'existing-assignment' }]);

    await expect(selectRoleForUser('user-1', 'DRIVER', null)).rejects.toThrow(
      RoleAlreadyAssignedError,
    );
    expect(mockedUpsertRoleAssignment).not.toHaveBeenCalled();
  });

  it('assigns CUSTOMER, creates the profile, and returns the resulting completion state', async () => {
    mockTx.userRole.findMany.mockResolvedValue([]);
    mockedFindRoleByCode.mockResolvedValue({ id: 'role-customer', code: 'CUSTOMER' });
    mockedEvaluate.mockResolvedValue({
      isComplete: false,
      role: 'CUSTOMER',
      missingFields: ['firstName', 'lastName'],
      nextPath: '/profile',
    });

    const result = await selectRoleForUser('user-1', 'CUSTOMER', null);

    expect(mockedUpsertRoleAssignment).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ userId: 'user-1', roleId: 'role-customer' }),
    );
    expect(getOrCreateCustomerProfile).toHaveBeenCalledWith('user-1', expect.anything());
    expect(getOrCreateDriverProfile).not.toHaveBeenCalled();
    expect(result.nextPath).toBe('/profile');
  });

  it('assigns DRIVER and creates the driver profile', async () => {
    mockTx.userRole.findMany.mockResolvedValue([]);
    mockedFindRoleByCode.mockResolvedValue({ id: 'role-driver', code: 'DRIVER' });
    mockedEvaluate.mockResolvedValue({
      isComplete: false,
      role: 'DRIVER',
      missingFields: ['onboarding'],
      nextPath: '/driver/onboarding',
    });

    const result = await selectRoleForUser('user-1', 'DRIVER', null);

    expect(getOrCreateDriverProfile).toHaveBeenCalledWith('user-1', expect.anything());
    expect(getOrCreateCustomerProfile).not.toHaveBeenCalled();
    expect(result.nextPath).toBe('/driver/onboarding');
  });

  it('prefills the customer profile from a Google name/avatar hint', async () => {
    mockTx.userRole.findMany.mockResolvedValue([]);
    mockedFindRoleByCode.mockResolvedValue({ id: 'role-customer', code: 'CUSTOMER' });
    mockedEvaluate.mockResolvedValue({
      isComplete: true,
      role: 'CUSTOMER',
      missingFields: [],
      nextPath: '/customer/dashboard',
    });

    await selectRoleForUser('user-1', 'CUSTOMER', {
      firstName: 'Asha',
      lastName: 'Rao',
      avatarUrl: 'https://example.com/avatar.png',
    });

    expect(updateCustomerProfile).toHaveBeenCalledWith(
      'user-1',
      { firstName: 'Asha', lastName: 'Rao', avatarUrl: 'https://example.com/avatar.png' },
      null,
    );
    expect(updateDriverProfile).not.toHaveBeenCalled();
  });

  it('does not call the update-profile step at all when there is no hint', async () => {
    mockTx.userRole.findMany.mockResolvedValue([]);
    mockedFindRoleByCode.mockResolvedValue({ id: 'role-customer', code: 'CUSTOMER' });
    mockedEvaluate.mockResolvedValue({
      isComplete: false,
      role: 'CUSTOMER',
      missingFields: ['firstName', 'lastName'],
      nextPath: '/profile',
    });

    await selectRoleForUser('user-1', 'CUSTOMER', null);

    expect(updateCustomerProfile).not.toHaveBeenCalled();
  });

  it('still returns the completion state even if prefilling the hint fails (best-effort, non-fatal)', async () => {
    mockTx.userRole.findMany.mockResolvedValue([]);
    mockedFindRoleByCode.mockResolvedValue({ id: 'role-customer', code: 'CUSTOMER' });
    (updateCustomerProfile as jest.Mock).mockRejectedValue(new Error('transient DB error'));
    mockedEvaluate.mockResolvedValue({
      isComplete: false,
      role: 'CUSTOMER',
      missingFields: ['firstName', 'lastName'],
      nextPath: '/profile',
    });

    const result = await selectRoleForUser('user-1', 'CUSTOMER', {
      firstName: 'Asha',
      lastName: null,
      avatarUrl: null,
    });

    expect(result.nextPath).toBe('/profile');
  });
});
