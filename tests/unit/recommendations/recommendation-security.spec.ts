import { PERMISSIONS } from '@/modules/identity/domain/permission-catalog';
import { ROLE_PERMISSION_MAP } from '@/modules/identity/domain/rbac-seed-data';
import { SYSTEM_ROLE_CODES } from '@/modules/identity/domain/role-catalog';

describe('Recommendation RBAC & Security Unit Tests', () => {
  it('registers RECOMMENDATIONS_READ in permission catalog', () => {
    expect(PERMISSIONS.RECOMMENDATIONS_READ).toBe('recommendations.read');
  });

  it('assigns RECOMMENDATIONS_READ to CUSTOMER role in ROLE_PERMISSION_MAP', () => {
    const customerPermissions = ROLE_PERMISSION_MAP[SYSTEM_ROLE_CODES.CUSTOMER];
    expect(customerPermissions).toBeDefined();
    expect(customerPermissions).toContain(PERMISSIONS.RECOMMENDATIONS_READ);
  });
});
