import { registerWithEmailPassword } from '@/modules/identity/application/services/auth-service';

const mockTx = {
  user: { findUnique: jest.fn() },
  userIdentity: { findFirst: jest.fn() },
  customerProfile: { create: jest.fn() },
  driverProfile: { create: jest.fn() },
  userReferralCode: { findUnique: jest.fn(), create: jest.fn() },
  referral: { findUnique: jest.fn(), create: jest.fn() },
  emailVerificationToken: { create: jest.fn() },
};

jest.mock('@/shared/database/prisma', () => ({
  prisma: {
    $transaction: jest.fn((cb: (tx: unknown) => unknown) => cb(mockTx)),
  },
}));

jest.mock('@/modules/identity/infrastructure/user-repository', () => ({
  findIdentityByEmail: jest.fn().mockResolvedValue(null),
  createUserWithIdentity: jest.fn().mockResolvedValue({
    user: { id: 'user-reg-1', accountStatus: 'PENDING', createdAt: new Date() },
    identity: { id: 'identity-1', providerName: 'email', email: 'test@example.com' },
  }),
}));

jest.mock('@/modules/identity/infrastructure/credential-repository', () => ({
  createUserCredential: jest.fn(),
}));

jest.mock('@/modules/identity/infrastructure/rbac-repository', () => ({
  findRoleByCode: jest.fn().mockResolvedValue({ id: 'role-1', code: 'CUSTOMER' }),
  upsertRoleAssignment: jest.fn(),
}));

jest.mock('@/modules/identity/application/services/session-service', () => ({
  createSessionForUser: jest.fn().mockResolvedValue({
    session: { id: 'session-1' },
    rawToken: 'raw-token-123',
  }),
}));

jest.mock('@/shared/audit/audit-service', () => ({ recordAuditLog: jest.fn() }));
jest.mock('@/shared/outbox/outbox-service', () => ({ insertOutboxEvent: jest.fn() }));

describe('Role-Aware Registration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockTx.userReferralCode.findUnique.mockResolvedValue(null);
    mockTx.userReferralCode.create.mockResolvedValue({ id: 'code-1', code: 'REF-NEW123' });
  });

  it('registers a CUSTOMER account, assigns CUSTOMER role, and creates CustomerProfile', async () => {
    const res = await registerWithEmailPassword({
      email: 'customer@example.com',
      password: 'StrongPassword!123',
      accountType: 'CUSTOMER',
      fullName: 'Anita Sharma',
    });

    expect(res.user.id).toBe('user-reg-1');
    expect(mockTx.customerProfile.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        userId: 'user-reg-1',
        firstName: 'Anita',
        lastName: 'Sharma',
        displayName: 'Anita Sharma',
      }),
    });
    expect(mockTx.driverProfile.create).not.toHaveBeenCalled();
  });

  it('registers a DRIVER account, assigns DRIVER role, and initializes DriverProfile with NOT_STARTED status', async () => {
    const res = await registerWithEmailPassword({
      email: 'driver@example.com',
      password: 'StrongPassword!123',
      accountType: 'DRIVER',
      fullName: 'Ramesh Kumar',
    });

    expect(res.user.id).toBe('user-reg-1');
    expect(mockTx.driverProfile.create).toHaveBeenCalledWith({
      data: {
        userId: 'user-reg-1',
        firstName: 'Ramesh',
        lastName: 'Kumar',
        displayName: 'Ramesh Kumar',
        onboardingStatus: 'NOT_STARTED',
        verificationStatus: 'NOT_VERIFIED',
        approvalStatus: 'PENDING',
        availabilityStatus: 'OFFLINE',
      },
    });
    expect(mockTx.customerProfile.create).not.toHaveBeenCalled();
  });
});
