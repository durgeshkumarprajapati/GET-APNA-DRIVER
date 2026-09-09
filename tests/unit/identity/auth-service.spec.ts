jest.mock('@/shared/database/prisma', () => ({
  prisma: {
    $transaction: jest.fn((cb: (tx: unknown) => unknown) =>
      cb({
        userSession: {
          updateMany: jest.fn(),
        },
      }),
    ),
    userIdentity: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
    },
  },
}));

jest.mock('@/shared/audit/audit-service', () => ({
  recordAuditLog: jest.fn(),
}));

jest.mock('@/shared/outbox/outbox-service', () => ({
  insertOutboxEvent: jest.fn(),
}));

jest.mock('@/shared/config/configuration-service', () => ({
  getInteger: jest.fn().mockImplementation((key: string, defaultValue: number) => {
    if (key === 'identity.otp.ttl_seconds') return Promise.resolve(300);
    if (key === 'identity.otp.max_attempts') return Promise.resolve(5);
    return Promise.resolve(defaultValue);
  }),
}));

jest.mock('@/modules/identity/infrastructure/user-repository', () => ({
  findIdentityByEmail: jest.fn(),
  findIdentityByPhone: jest.fn(),
  findIdentityWithUser: jest.fn(),
  createUserWithIdentity: jest.fn(),
  addUserIdentityToUser: jest.fn(),
  markIdentityVerified: jest.fn(),
  findUserById: jest.fn(),
  updateAccountStatus: jest.fn(),
}));

jest.mock('@/modules/identity/infrastructure/credential-repository', () => ({
  createUserCredential: jest.fn(),
  findUserCredentialByUserId: jest.fn(),
  updateUserCredentialPassword: jest.fn(),
}));

jest.mock('@/modules/identity/infrastructure/token-repository', () => ({
  createEmailVerificationToken: jest.fn(),
  findEmailVerificationTokenByHash: jest.fn(),
  markEmailVerificationTokenUsed: jest.fn(),
  createPasswordResetToken: jest.fn(),
  findPasswordResetTokenByHash: jest.fn(),
  markPasswordResetTokenUsed: jest.fn(),
  createOtpChallenge: jest.fn(),
  findLatestOtpChallengeByPhone: jest.fn(),
  incrementOtpChallengeAttempts: jest.fn(),
  markOtpChallengeVerified: jest.fn(),
}));

jest.mock('@/modules/identity/infrastructure/rbac-repository', () => ({
  findRoleByCode: jest.fn(),
  upsertRoleAssignment: jest.fn(),
}));

jest.mock('@/modules/identity/application/services/session-service', () => ({
  createSessionForUser: jest.fn().mockResolvedValue({
    session: { id: 'sess-1', userId: 'user-1' },
    rawToken: 'mock-session-raw-token',
  }),
  revokeAllSessionsForUser: jest.fn(),
}));

import {
  registerWithEmailPassword,
  loginWithEmailPassword,
  requestPhoneOtp,
  verifyPhoneOtp,
  verifyEmailWithToken,
  resetPasswordWithToken,
} from '@/modules/identity/application/services/auth-service';
import * as userRepository from '@/modules/identity/infrastructure/user-repository';
import * as credentialRepository from '@/modules/identity/infrastructure/credential-repository';
import * as tokenRepository from '@/modules/identity/infrastructure/token-repository';
import * as rbacRepository from '@/modules/identity/infrastructure/rbac-repository';
import { hashPassword } from '@/modules/identity/security/password';
import { hashOtp } from '@/modules/identity/security/otp';
import {
  AccountNotActiveError,
  DuplicateIdentityError,
  InvalidCredentialsError,
  InvalidPasswordPolicyError,
} from '@/modules/identity/domain/errors';

describe('Auth Service', () => {
  const mockedFindIdentityByEmail = userRepository.findIdentityByEmail as jest.Mock;
  const mockedCreateUserWithIdentity = userRepository.createUserWithIdentity as jest.Mock;
  const mockedFindRoleByCode = rbacRepository.findRoleByCode as jest.Mock;
  const mockedUpsertRole = rbacRepository.upsertRoleAssignment as jest.Mock;
  const mockedCreateCredential = credentialRepository.createUserCredential as jest.Mock;
  const mockedFindCredential = credentialRepository.findUserCredentialByUserId as jest.Mock;
  const mockedFindLatestOtp = tokenRepository.findLatestOtpChallengeByPhone as jest.Mock;
  const mockedFindEmailToken = tokenRepository.findEmailVerificationTokenByHash as jest.Mock;
  const mockedFindResetToken = tokenRepository.findPasswordResetTokenByHash as jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('registerWithEmailPassword', () => {
    it('registers user, hashes password, assigns CUSTOMER role, and creates session', async () => {
      mockedFindIdentityByEmail.mockResolvedValue(null);
      mockedCreateUserWithIdentity.mockResolvedValue({
        user: { id: 'user-1', accountStatus: 'PENDING', createdAt: new Date() },
        identity: { id: 'ident-1', providerName: 'email', email: 'test@example.com' },
      });
      mockedFindRoleByCode.mockResolvedValue({ id: 'role-customer', code: 'CUSTOMER' });

      const res = await registerWithEmailPassword({
        email: 'test@example.com',
        password: 'ValidP@ssword123',
      });

      expect(res.user.id).toBe('user-1');
      expect(res.rawSessionToken).toBe('mock-session-raw-token');
      expect(mockedCreateCredential).toHaveBeenCalledWith(
        expect.anything(),
        'user-1',
        expect.stringMatching(/^scrypt\$/),
      );
      expect(mockedUpsertRole).toHaveBeenCalledWith(expect.anything(), {
        userId: 'user-1',
        roleId: 'role-customer',
        assignedBy: null,
      });
    });

    it('rejects duplicate email registration', async () => {
      mockedFindIdentityByEmail.mockResolvedValue({ id: 'existing-id' });

      await expect(
        registerWithEmailPassword({ email: 'duplicate@example.com', password: 'ValidP@ssword123' }),
      ).rejects.toThrow(DuplicateIdentityError);
    });

    it('rejects weak passwords failing policy check', async () => {
      await expect(
        registerWithEmailPassword({ email: 'weak@example.com', password: '123' }),
      ).rejects.toThrow(InvalidPasswordPolicyError);
    });
  });

  describe('loginWithEmailPassword', () => {
    it('authenticates user with correct password', async () => {
      const password = 'ValidP@ssword123';
      const passwordHash = await hashPassword(password);

      mockedFindIdentityByEmail.mockResolvedValue({
        id: 'ident-1',
        providerName: 'email',
        email: 'user@example.com',
        user: { id: 'user-1', accountStatus: 'ACTIVE' },
      });

      mockedFindCredential.mockResolvedValue({
        id: 'cred-1',
        userId: 'user-1',
        passwordHash,
      });

      const res = await loginWithEmailPassword({ email: 'user@example.com', password });

      expect(res.user.id).toBe('user-1');
      expect(res.rawSessionToken).toBe('mock-session-raw-token');
    });

    it('rejects invalid password with generic credentials error', async () => {
      const passwordHash = await hashPassword('CorrectP@ssword123');

      mockedFindIdentityByEmail.mockResolvedValue({
        id: 'ident-1',
        user: { id: 'user-1', accountStatus: 'ACTIVE' },
      });

      mockedFindCredential.mockResolvedValue({ passwordHash });

      await expect(
        loginWithEmailPassword({ email: 'user@example.com', password: 'WrongP@ssword123' }),
      ).rejects.toThrow(InvalidCredentialsError);
    });

    it('blocks suspended accounts from logging in', async () => {
      const password = 'ValidP@ssword123';
      mockedFindIdentityByEmail.mockResolvedValue({
        id: 'ident-1',
        user: { id: 'user-1', accountStatus: 'SUSPENDED' },
      });

      await expect(loginWithEmailPassword({ email: 'user@example.com', password })).rejects.toThrow(
        AccountNotActiveError,
      );
    });
  });

  describe('Phone OTP Authentication', () => {
    it('dispatches OTP challenge for valid phone number', async () => {
      const result = await requestPhoneOtp({ phoneNumber: '+919876543210' });
      expect(result.expiresAt).toBeDefined();
      expect(tokenRepository.createOtpChallenge).toHaveBeenCalled();
    });

    it('verifies correct OTP code and creates active session', async () => {
      const phone = '+919876543210';
      const otp = '123456';
      const otpHash = hashOtp(otp);

      mockedFindLatestOtp.mockResolvedValue({
        id: 'challenge-1',
        phoneNumber: phone,
        otpHash,
        attempts: 0,
        maxAttempts: 5,
        expiresAt: new Date(Date.now() + 100000),
        verifiedAt: null,
      });

      (userRepository.findIdentityByPhone as jest.Mock).mockResolvedValue(null);
      (userRepository.createUserWithIdentity as jest.Mock).mockResolvedValue({
        user: { id: 'phone-user-1', accountStatus: 'ACTIVE' },
        identity: { id: 'phone-ident-1', providerName: 'phone' },
      });

      const res = await verifyPhoneOtp({ phoneNumber: phone, otp });
      expect(res.user.id).toBe('phone-user-1');
    });
  });

  describe('Email Verification', () => {
    it('activates PENDING account when valid verification token is presented', async () => {
      mockedFindEmailToken.mockResolvedValue({
        id: 'token-1',
        userId: 'user-1',
        identityId: 'ident-1',
        expiresAt: new Date(Date.now() + 100000),
        usedAt: null,
      });

      (userRepository.findUserById as jest.Mock).mockResolvedValue({
        id: 'user-1',
        accountStatus: 'PENDING',
      });

      (userRepository.updateAccountStatus as jest.Mock).mockResolvedValue({
        id: 'user-1',
        accountStatus: 'ACTIVE',
      });

      const res = await verifyEmailWithToken('valid-token-str');
      expect(res.user.accountStatus).toBe('ACTIVE');
    });
  });

  describe('Password Reset', () => {
    it('resets password and invalidates sessions with valid token', async () => {
      mockedFindResetToken.mockResolvedValue({
        id: 'reset-1',
        userId: 'user-1',
        expiresAt: new Date(Date.now() + 100000),
        usedAt: null,
      });

      await resetPasswordWithToken('valid-reset-token', 'NewP@ssword123');

      expect(credentialRepository.updateUserCredentialPassword).toHaveBeenCalled();
    });
  });
});
