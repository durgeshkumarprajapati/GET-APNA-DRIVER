import { PERMISSIONS } from '@/modules/identity/domain/permission-catalog';

describe('Vehicle Capability & Master Category RBAC Declarations', () => {
  it('defines valid system permissions for vehicle categories and driver capabilities', () => {
    expect(PERMISSIONS.SYSTEM_CONFIGURATION_MANAGE).toBeDefined();
    expect(PERMISSIONS.DRIVER_PROFILE_MANAGE).toBeDefined();
    expect(PERMISSIONS.BOOKINGS_READ).toBeDefined();
    expect(PERMISSIONS.BOOKINGS_CREATE).toBeDefined();
  });
});
