import { ROLE_PERMISSION_MAP } from '@/modules/identity/domain/rbac-seed-data';
import { SYSTEM_ROLE_CODES } from '@/modules/identity/domain/role-catalog';
import { PERMISSIONS } from '@/modules/identity/domain/permission-catalog';

describe('ROLE_PERMISSION_MAP', () => {
  it('never grants CUSTOMER an administrative permission', () => {
    const granted = ROLE_PERMISSION_MAP[SYSTEM_ROLE_CODES.CUSTOMER];
    expect(granted).not.toContain(PERMISSIONS.SYSTEM_CONFIGURATION_MANAGE);
    expect(granted).not.toContain(PERMISSIONS.IDENTITY_USERS_ROLES_MANAGE);
    expect(granted).not.toContain(PERMISSIONS.IDENTITY_USERS_STATUS_MANAGE);
    expect(granted).not.toContain(PERMISSIONS.ADMIN_DRIVER_APPROVE);
    expect(granted).not.toContain(PERMISSIONS.PAYMENTS_REFUND);
    expect(granted).not.toContain(PERMISSIONS.FINANCE_READ);
    expect(granted).not.toContain(PERMISSIONS.FINANCE_SETTLEMENT_MANAGE);
    expect(granted).not.toContain(PERMISSIONS.FINANCE_WALLET_READ); // driver-only, not customer
  });

  it('never grants DRIVER an administrative permission', () => {
    const granted = ROLE_PERMISSION_MAP[SYSTEM_ROLE_CODES.DRIVER];
    expect(granted).not.toContain(PERMISSIONS.SYSTEM_CONFIGURATION_MANAGE);
    expect(granted).not.toContain(PERMISSIONS.IDENTITY_USERS_ROLES_MANAGE);
    expect(granted).not.toContain(PERMISSIONS.IDENTITY_USERS_STATUS_MANAGE);
    expect(granted).not.toContain(PERMISSIONS.ADMIN_DRIVER_APPROVE);
    expect(granted).not.toContain(PERMISSIONS.PAYMENTS_REFUND);
    expect(granted).not.toContain(PERMISSIONS.FINANCE_READ);
    expect(granted).not.toContain(PERMISSIONS.FINANCE_SETTLEMENT_MANAGE);
  });

  it('grants only DRIVER (not CUSTOMER) the ability to read their own wallet', () => {
    expect(ROLE_PERMISSION_MAP[SYSTEM_ROLE_CODES.DRIVER]).toContain(
      PERMISSIONS.FINANCE_WALLET_READ,
    );
    expect(ROLE_PERMISSION_MAP[SYSTEM_ROLE_CODES.CUSTOMER]).not.toContain(
      PERMISSIONS.FINANCE_WALLET_READ,
    );
  });

  it('grants only CUSTOMER (not DRIVER) the ability to create a payment', () => {
    expect(ROLE_PERMISSION_MAP[SYSTEM_ROLE_CODES.CUSTOMER]).toContain(PERMISSIONS.PAYMENTS_CREATE);
    expect(ROLE_PERMISSION_MAP[SYSTEM_ROLE_CODES.DRIVER]).not.toContain(
      PERMISSIONS.PAYMENTS_CREATE,
    );
  });

  it('grants ADMINISTRATOR every catalog permission', () => {
    expect(new Set(ROLE_PERMISSION_MAP[SYSTEM_ROLE_CODES.ADMINISTRATOR])).toEqual(
      new Set(Object.values(PERMISSIONS)),
    );
  });
});
