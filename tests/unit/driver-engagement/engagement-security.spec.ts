import { PERMISSIONS } from '@/modules/identity/domain/permission-catalog';
import { SYSTEM_ROLE_CODES } from '@/modules/identity/domain/role-catalog';
import { ROLE_PERMISSION_MAP } from '@/modules/identity/domain/rbac-seed-data';

describe('Engagement Security & Authorization Unit Tests', () => {
  it('grants DRIVER_ENGAGEMENT_READ to DRIVER role', () => {
    const driverPermissions = ROLE_PERMISSION_MAP[SYSTEM_ROLE_CODES.DRIVER];
    expect(driverPermissions).toContain(PERMISSIONS.DRIVER_ENGAGEMENT_READ);
  });

  it('does NOT grant admin achievement management permissions to DRIVER role', () => {
    const driverPermissions = ROLE_PERMISSION_MAP[SYSTEM_ROLE_CODES.DRIVER];
    expect(driverPermissions).not.toContain(PERMISSIONS.ADMIN_DRIVER_ACHIEVEMENTS_READ);
    expect(driverPermissions).not.toContain(PERMISSIONS.ADMIN_DRIVER_ACHIEVEMENTS_MANAGE);
  });

  it('does NOT grant admin achievement management permissions to CUSTOMER role', () => {
    const customerPermissions = ROLE_PERMISSION_MAP[SYSTEM_ROLE_CODES.CUSTOMER];
    expect(customerPermissions).not.toContain(PERMISSIONS.DRIVER_ENGAGEMENT_READ);
    expect(customerPermissions).not.toContain(PERMISSIONS.ADMIN_DRIVER_ACHIEVEMENTS_READ);
    expect(customerPermissions).not.toContain(PERMISSIONS.ADMIN_DRIVER_ACHIEVEMENTS_MANAGE);
  });

  it('grants all admin achievement permissions to ADMINISTRATOR role', () => {
    const adminPermissions = ROLE_PERMISSION_MAP[SYSTEM_ROLE_CODES.ADMINISTRATOR];
    expect(adminPermissions).toContain(PERMISSIONS.ADMIN_DRIVER_ACHIEVEMENTS_READ);
    expect(adminPermissions).toContain(PERMISSIONS.ADMIN_DRIVER_ACHIEVEMENTS_MANAGE);
  });
});
