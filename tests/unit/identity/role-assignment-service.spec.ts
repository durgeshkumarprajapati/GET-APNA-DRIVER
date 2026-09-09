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
}));

jest.mock('@/modules/identity/infrastructure/rbac-repository', () => ({
  findRoleByCode: jest.fn(),
  findUserRoleAssignment: jest.fn(),
  upsertRoleAssignment: jest.fn(),
  revokeRoleAssignment: jest.fn(),
  countActiveRoleAssignments: jest.fn(),
}));

import {
  assignRole,
  revokeRole,
} from '@/modules/identity/application/services/role-assignment-service';
import * as userRepository from '@/modules/identity/infrastructure/user-repository';
import * as rbacRepository from '@/modules/identity/infrastructure/rbac-repository';
import { recordAuditLog } from '@/shared/audit/audit-service';
import { insertOutboxEvent } from '@/shared/outbox/outbox-service';
import { PERMISSIONS } from '@/modules/identity/domain/permission-catalog';
import { SYSTEM_ROLE_CODES } from '@/modules/identity/domain/role-catalog';
import {
  ForbiddenError,
  LastAdministratorError,
  RoleNotAssignedError,
  RoleNotFoundError,
  SelfRoleEscalationError,
  UserNotFoundError,
} from '@/modules/identity/domain/errors';
import type { AuthenticatedPrincipal } from '@/modules/identity/domain/types';

const mockedFindUserById = userRepository.findUserById as jest.Mock;
const mockedFindRoleByCode = rbacRepository.findRoleByCode as jest.Mock;
const mockedFindUserRoleAssignment = rbacRepository.findUserRoleAssignment as jest.Mock;
const mockedUpsertRoleAssignment = rbacRepository.upsertRoleAssignment as jest.Mock;
const mockedRevokeRoleAssignment = rbacRepository.revokeRoleAssignment as jest.Mock;
const mockedCountActiveRoleAssignments = rbacRepository.countActiveRoleAssignments as jest.Mock;
const mockedRecordAuditLog = recordAuditLog as jest.Mock;
const mockedInsertOutboxEvent = insertOutboxEvent as jest.Mock;

const adminPrincipal: AuthenticatedPrincipal = {
  userId: 'admin-1',
  accountStatus: 'ACTIVE',
  roles: [SYSTEM_ROLE_CODES.ADMINISTRATOR],
  permissions: [PERMISSIONS.IDENTITY_USERS_ROLES_MANAGE],
};

const customerPrincipal: AuthenticatedPrincipal = {
  userId: 'customer-1',
  accountStatus: 'ACTIVE',
  roles: [SYSTEM_ROLE_CODES.CUSTOMER],
  permissions: [],
};

describe('assignRole', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('assigns a role when the actor has identity.users.roles.manage', async () => {
    mockedFindUserById.mockResolvedValue({ id: 'user-1' });
    mockedFindRoleByCode.mockResolvedValue({ id: 'role-driver', code: SYSTEM_ROLE_CODES.DRIVER });
    mockedFindUserRoleAssignment.mockResolvedValue(null);
    mockedUpsertRoleAssignment.mockResolvedValue({ id: 'assignment-1', revokedAt: null });

    const result = await assignRole({
      userId: 'user-1',
      roleCode: SYSTEM_ROLE_CODES.DRIVER,
      actor: adminPrincipal,
    });

    expect(result.id).toBe('assignment-1');
    expect(mockedRecordAuditLog).toHaveBeenCalledTimes(1);
    expect(mockedInsertOutboxEvent).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ eventType: 'user.role_assigned' }),
    );
  });

  it('rejects an actor without identity.users.roles.manage', async () => {
    await expect(
      assignRole({
        userId: 'user-1',
        roleCode: SYSTEM_ROLE_CODES.DRIVER,
        actor: customerPrincipal,
      }),
    ).rejects.toThrow(ForbiddenError);
    expect(mockedFindUserById).not.toHaveBeenCalled();
  });

  it('never allows an actor to grant themselves ADMINISTRATOR, even with the manage permission', async () => {
    await expect(
      assignRole({
        userId: adminPrincipal.userId,
        roleCode: SYSTEM_ROLE_CODES.ADMINISTRATOR,
        actor: adminPrincipal,
      }),
    ).rejects.toThrow(SelfRoleEscalationError);
    expect(mockedFindUserById).not.toHaveBeenCalled();
  });

  it('throws when the target user does not exist', async () => {
    mockedFindUserById.mockResolvedValue(null);

    await expect(
      assignRole({ userId: 'missing', roleCode: SYSTEM_ROLE_CODES.DRIVER, actor: adminPrincipal }),
    ).rejects.toThrow(UserNotFoundError);
  });

  it('throws when the role code does not exist', async () => {
    mockedFindUserById.mockResolvedValue({ id: 'user-1' });
    mockedFindRoleByCode.mockResolvedValue(null);

    await expect(
      assignRole({ userId: 'user-1', roleCode: 'NOT_A_ROLE', actor: adminPrincipal }),
    ).rejects.toThrow(RoleNotFoundError);
  });

  it('does not write a duplicate audit entry when the role is already active', async () => {
    mockedFindUserById.mockResolvedValue({ id: 'user-1' });
    mockedFindRoleByCode.mockResolvedValue({ id: 'role-driver', code: SYSTEM_ROLE_CODES.DRIVER });
    mockedFindUserRoleAssignment.mockResolvedValue({ id: 'assignment-1', revokedAt: null });
    mockedUpsertRoleAssignment.mockResolvedValue({ id: 'assignment-1', revokedAt: null });

    await assignRole({
      userId: 'user-1',
      roleCode: SYSTEM_ROLE_CODES.DRIVER,
      actor: adminPrincipal,
    });

    expect(mockedRecordAuditLog).not.toHaveBeenCalled();
    expect(mockedInsertOutboxEvent).not.toHaveBeenCalled();
  });
});

describe('revokeRole', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('revokes a currently active role', async () => {
    mockedFindRoleByCode.mockResolvedValue({ id: 'role-driver', code: SYSTEM_ROLE_CODES.DRIVER });
    mockedFindUserRoleAssignment.mockResolvedValue({ id: 'assignment-1', revokedAt: null });
    mockedRevokeRoleAssignment.mockResolvedValue({ id: 'assignment-1', revokedAt: new Date() });

    const result = await revokeRole({
      userId: 'user-1',
      roleCode: SYSTEM_ROLE_CODES.DRIVER,
      actor: adminPrincipal,
    });

    expect(result.revokedAt).not.toBeNull();
    expect(mockedRecordAuditLog).toHaveBeenCalledTimes(1);
  });

  it('throws when the role is not currently assigned', async () => {
    mockedFindRoleByCode.mockResolvedValue({ id: 'role-driver', code: SYSTEM_ROLE_CODES.DRIVER });
    mockedFindUserRoleAssignment.mockResolvedValue(null);

    await expect(
      revokeRole({ userId: 'user-1', roleCode: SYSTEM_ROLE_CODES.DRIVER, actor: adminPrincipal }),
    ).rejects.toThrow(RoleNotAssignedError);
  });

  it('rejects an actor without identity.users.roles.manage', async () => {
    await expect(
      revokeRole({
        userId: 'user-1',
        roleCode: SYSTEM_ROLE_CODES.DRIVER,
        actor: customerPrincipal,
      }),
    ).rejects.toThrow(ForbiddenError);
  });

  it('throws LastAdministratorError instead of revoking the sole remaining ADMINISTRATOR', async () => {
    mockedFindRoleByCode.mockResolvedValue({
      id: 'role-admin',
      code: SYSTEM_ROLE_CODES.ADMINISTRATOR,
    });
    mockedFindUserRoleAssignment.mockResolvedValue({ id: 'assignment-1', revokedAt: null });
    mockedCountActiveRoleAssignments.mockResolvedValue(1);

    await expect(
      revokeRole({
        userId: 'user-1',
        roleCode: SYSTEM_ROLE_CODES.ADMINISTRATOR,
        actor: adminPrincipal,
      }),
    ).rejects.toThrow(LastAdministratorError);
    expect(mockedRevokeRoleAssignment).not.toHaveBeenCalled();
  });

  it('allows revoking ADMINISTRATOR when other administrators remain', async () => {
    mockedFindRoleByCode.mockResolvedValue({
      id: 'role-admin',
      code: SYSTEM_ROLE_CODES.ADMINISTRATOR,
    });
    mockedFindUserRoleAssignment.mockResolvedValue({ id: 'assignment-1', revokedAt: null });
    mockedCountActiveRoleAssignments.mockResolvedValue(2);
    mockedRevokeRoleAssignment.mockResolvedValue({ id: 'assignment-1', revokedAt: new Date() });

    const result = await revokeRole({
      userId: 'user-1',
      roleCode: SYSTEM_ROLE_CODES.ADMINISTRATOR,
      actor: adminPrincipal,
    });

    expect(result.revokedAt).not.toBeNull();
  });
});
