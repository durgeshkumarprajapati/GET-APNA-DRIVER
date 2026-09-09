jest.mock('@/shared/database/prisma', () => ({
  prisma: { $transaction: jest.fn((callback: (tx: unknown) => unknown) => callback({})) },
}));

jest.mock('@/shared/audit/audit-service', () => ({
  recordAuditLog: jest.fn(),
}));

jest.mock('@/shared/outbox/outbox-service', () => ({
  insertOutboxEvent: jest.fn(),
}));

jest.mock('@/modules/identity/infrastructure/user-repository', () => ({
  findUserById: jest.fn(),
  updateAccountStatus: jest.fn(),
}));

import { transitionAccountStatus } from '@/modules/identity/application/services/account-status-service';
import * as userRepository from '@/modules/identity/infrastructure/user-repository';
import { insertOutboxEvent } from '@/shared/outbox/outbox-service';
import { PERMISSIONS } from '@/modules/identity/domain/permission-catalog';
import {
  ForbiddenError,
  InvalidAccountStatusTransitionError,
  UserNotFoundError,
} from '@/modules/identity/domain/errors';
import type { AuthenticatedPrincipal } from '@/modules/identity/domain/types';

const mockedFindUserById = userRepository.findUserById as jest.Mock;
const mockedUpdateAccountStatus = userRepository.updateAccountStatus as jest.Mock;
const mockedInsertOutboxEvent = insertOutboxEvent as jest.Mock;

const adminPrincipal: AuthenticatedPrincipal = {
  userId: 'admin-1',
  accountStatus: 'ACTIVE',
  roles: ['ADMINISTRATOR'],
  permissions: [PERMISSIONS.IDENTITY_USERS_STATUS_MANAGE],
};

const customerPrincipal: AuthenticatedPrincipal = {
  userId: 'customer-1',
  accountStatus: 'ACTIVE',
  roles: ['CUSTOMER'],
  permissions: [],
};

describe('transitionAccountStatus', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('allows an admin to suspend an active user', async () => {
    mockedFindUserById.mockResolvedValue({ id: 'user-1', accountStatus: 'ACTIVE' });
    mockedUpdateAccountStatus.mockResolvedValue({ id: 'user-1', accountStatus: 'SUSPENDED' });

    const result = await transitionAccountStatus({
      userId: 'user-1',
      targetStatus: 'SUSPENDED',
      actor: adminPrincipal,
    });

    expect(result.accountStatus).toBe('SUSPENDED');
    expect(mockedInsertOutboxEvent).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ eventType: 'user.account_suspended' }),
    );
  });

  it('rejects a non-privileged actor suspending someone else', async () => {
    await expect(
      transitionAccountStatus({
        userId: 'other-user',
        targetStatus: 'SUSPENDED',
        actor: customerPrincipal,
      }),
    ).rejects.toThrow(ForbiddenError);
    expect(mockedFindUserById).not.toHaveBeenCalled();
  });

  it('allows a user to deactivate their own account without the admin permission', async () => {
    mockedFindUserById.mockResolvedValue({ id: 'customer-1', accountStatus: 'ACTIVE' });
    mockedUpdateAccountStatus.mockResolvedValue({ id: 'customer-1', accountStatus: 'DEACTIVATED' });

    const result = await transitionAccountStatus({
      userId: 'customer-1',
      targetStatus: 'DEACTIVATED',
      actor: customerPrincipal,
    });

    expect(result.accountStatus).toBe('DEACTIVATED');
  });

  it('rejects an invalid transition (DELETED -> ACTIVE)', async () => {
    mockedFindUserById.mockResolvedValue({ id: 'user-1', accountStatus: 'DELETED' });

    await expect(
      transitionAccountStatus({ userId: 'user-1', targetStatus: 'ACTIVE', actor: adminPrincipal }),
    ).rejects.toThrow(InvalidAccountStatusTransitionError);
    expect(mockedUpdateAccountStatus).not.toHaveBeenCalled();
  });

  it('throws when the target user does not exist', async () => {
    mockedFindUserById.mockResolvedValue(null);

    await expect(
      transitionAccountStatus({
        userId: 'missing',
        targetStatus: 'SUSPENDED',
        actor: adminPrincipal,
      }),
    ).rejects.toThrow(UserNotFoundError);
  });

  it('allows a system-initiated transition without an actor', async () => {
    mockedFindUserById.mockResolvedValue({ id: 'user-1', accountStatus: 'PENDING' });
    mockedUpdateAccountStatus.mockResolvedValue({ id: 'user-1', accountStatus: 'ACTIVE' });

    const result = await transitionAccountStatus({
      userId: 'user-1',
      targetStatus: 'ACTIVE',
      actor: null,
    });

    expect(result.accountStatus).toBe('ACTIVE');
  });
});
