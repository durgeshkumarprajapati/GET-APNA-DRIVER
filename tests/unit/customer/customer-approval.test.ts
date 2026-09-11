import { AccountStatus } from '@prisma/client';
import {
  approveCustomer,
  InvalidCustomerStatusError,
} from '@/modules/customer/application/customer-approval-service';
import { PERMISSIONS } from '@/modules/identity/domain/permission-catalog';
import { ForbiddenError } from '@/modules/identity/domain/errors';
import type { AuthenticatedPrincipal } from '@/modules/identity/domain/types';

describe('Phase 26 — Admin Customer Approval Service', () => {
  const mockAdminPrincipal: AuthenticatedPrincipal = {
    userId: 'admin-user-123',
    accountStatus: AccountStatus.ACTIVE,
    roles: ['ADMINISTRATOR'],
    permissions: [PERMISSIONS.ADMIN_CUSTOMER_APPROVE, PERMISSIONS.ADMIN_CUSTOMER_READ],
  };

  const mockUnauthorizedPrincipal: AuthenticatedPrincipal = {
    userId: 'driver-user-456',
    accountStatus: AccountStatus.ACTIVE,
    roles: ['DRIVER'],
    permissions: [PERMISSIONS.DRIVER_JOURNEY_MANAGE],
  };

  it('rejects approval when principal lacks admin.customer.approve permission', async () => {
    await expect(
      approveCustomer({ customerId: 'cust-1', actor: mockUnauthorizedPrincipal }),
    ).rejects.toThrow(ForbiddenError);
  });

  it('approves a PENDING customer successfully when authorized', async () => {
    const mockDb = {
      customerProfile: {
        findFirst: jest.fn().mockResolvedValue({
          id: 'cust-profile-100',
          userId: 'user-cust-100',
          user: {
            id: 'user-cust-100',
            accountStatus: AccountStatus.PENDING,
          },
        }),
      },
      $transaction: jest.fn().mockImplementation(async (callback) => {
        const txDb = {
          user: { update: jest.fn().mockResolvedValue({ id: 'user-cust-100', accountStatus: AccountStatus.ACTIVE }) },
          auditLog: { create: jest.fn() },
          outboxEvent: { create: jest.fn() },
        };
        return callback(txDb);
      }),
    };

    const result = await approveCustomer(
      { customerId: 'cust-profile-100', actor: mockAdminPrincipal },
      mockDb as unknown as Parameters<typeof approveCustomer>[1],
    );

    expect(result.customerProfileId).toBe('cust-profile-100');
    expect(result.previousStatus).toBe(AccountStatus.PENDING);
    expect(result.newStatus).toBe(AccountStatus.ACTIVE);
    expect(result.approvedByAdminUserId).toBe(mockAdminPrincipal.userId);
  });

  it('returns idempotent result if customer is already ACTIVE', async () => {
    const mockDb = {
      customerProfile: {
        findFirst: jest.fn().mockResolvedValue({
          id: 'cust-profile-200',
          userId: 'user-cust-200',
          user: {
            id: 'user-cust-200',
            accountStatus: AccountStatus.ACTIVE,
          },
        }),
      },
    };

    const result = await approveCustomer(
      { customerId: 'cust-profile-200', actor: mockAdminPrincipal },
      mockDb as unknown as Parameters<typeof approveCustomer>[1],
    );

    expect(result.newStatus).toBe(AccountStatus.ACTIVE);
    expect(mockDb.customerProfile.findFirst).toHaveBeenCalled();
  });

  it('rejects approval if customer is in SUSPENDED status', async () => {
    const mockDb = {
      customerProfile: {
        findFirst: jest.fn().mockResolvedValue({
          id: 'cust-profile-300',
          userId: 'user-cust-300',
          user: {
            id: 'user-cust-300',
            accountStatus: AccountStatus.SUSPENDED,
          },
        }),
      },
    };

    await expect(
      approveCustomer(
        { customerId: 'cust-profile-300', actor: mockAdminPrincipal },
        mockDb as unknown as Parameters<typeof approveCustomer>[1],
      ),
    ).rejects.toThrow(InvalidCustomerStatusError);
  });
});
