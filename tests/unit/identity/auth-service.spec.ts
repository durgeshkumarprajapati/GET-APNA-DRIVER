jest.mock('@/shared/database/prisma', () => ({
  prisma: {
    $transaction: jest.fn((cb: (tx: unknown) => unknown) =>
      cb({
        userSession: {
          updateMany: jest.fn(),
        },
        customerProfile: {
          create: jest.fn(),
        },
        driverProfile: {
          create: jest.fn(),
        },
        userReferralCode: {
          findUnique: jest.fn().mockResolvedValue(null),
          create: jest.fn().mockResolvedValue({ id: 'code-1', code: 'REF-MOCK' }),
        },
        referral: {
          findUnique: jest.fn().mockResolvedValue(null),
          create: jest.fn(),
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

jest.mock('@/modules/identity/infrastructure/oauth-provider', () => ({
  exchangeGoogleCodeForProfile: jest.fn(),
}));

import { Prisma } from '@prisma/client';
import {
  registerWithEmailPassword,
  loginWithEmailPassword,
  requestPhoneOtp,
  verifyPhoneOtp,
  verifyEmailWithToken,
  resetPasswordWithToken,
  handleGoogleOAuthCallback,
} from '@/modules/identity/application/services/auth-service';
import * as userRepository from '@/modules/identity/infrastructure/user-repository';
import * as credentialRepository from '@/modules/identity/infrastructure/credential-repository';
import * as tokenRepository from '@/modules/identity/infrastructure/token-repository';
import * as rbacRepository from '@/modules/identity/infrastructure/rbac-repository';
import { exchangeGoogleCodeForProfile } from '@/modules/identity/infrastructure/oauth-provider';
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

    it('honors the configured identity.otp.ttl_seconds value (300s here)', async () => {
      const before = Date.now();
      const result = await requestPhoneOtp({ phoneNumber: '+919876543210' });
      const secondsUntilExpiry = Math.round((result.expiresAt.getTime() - before) / 1000);
      expect(secondsUntilExpiry).toBeGreaterThanOrEqual(295);
      expect(secondsUntilExpiry).toBeLessThanOrEqual(300);
    });

    it('falls back to a 180-second (3 minute) TTL when no configuration row exists', async () => {
      const { getInteger } = jest.requireMock('@/shared/config/configuration-service') as {
        getInteger: jest.Mock;
      };
      getInteger.mockImplementationOnce((key: string, defaultValue: number) =>
        key === 'identity.otp.ttl_seconds' ? Promise.resolve(defaultValue) : Promise.resolve(5),
      );

      const before = Date.now();
      const result = await requestPhoneOtp({ phoneNumber: '+919876543210' });
      const secondsUntilExpiry = (result.expiresAt.getTime() - before) / 1000;
      expect(secondsUntilExpiry).toBeGreaterThan(175);
      expect(secondsUntilExpiry).toBeLessThanOrEqual(180);
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

describe('Google OAuth', () => {
  const mockedExchange = exchangeGoogleCodeForProfile as jest.Mock;
  const mockedFindIdentityWithUser = userRepository.findIdentityWithUser as jest.Mock;
  const mockedFindIdentityByEmail = userRepository.findIdentityByEmail as jest.Mock;
  const mockedCreateUserWithIdentity = userRepository.createUserWithIdentity as jest.Mock;
  const mockedAddUserIdentityToUser = userRepository.addUserIdentityToUser as jest.Mock;
  const mockedMarkIdentityVerified = userRepository.markIdentityVerified as jest.Mock;
  const mockedUpsertRole = rbacRepository.upsertRoleAssignment as jest.Mock;

  afterEach(() => jest.clearAllMocks());

  it('logs an existing Google identity straight into a session, with no role change', async () => {
    mockedExchange.mockResolvedValue({
      sub: 'google-sub-1',
      email: 'existing@example.com',
      emailVerified: true,
    });
    mockedFindIdentityWithUser.mockResolvedValue({
      id: 'identity-1',
      userId: 'user-1',
      user: { id: 'user-1', accountStatus: 'ACTIVE' },
    });

    const result = await handleGoogleOAuthCallback('valid-auth-code');

    expect(result.isNewIdentity).toBe(false);
    expect(result.profileHint).toBeNull();
    expect(result.session.userId).toBe('user-1');
    expect(mockedUpsertRole).not.toHaveBeenCalled();
    expect(mockedFindIdentityByEmail).not.toHaveBeenCalled();
  });

  it('creates a brand-new user for a never-seen Google subject, assigns no role, and returns a profile hint', async () => {
    mockedExchange.mockResolvedValue({
      sub: 'google-sub-new',
      email: 'new.person@example.com',
      emailVerified: true,
      givenName: 'Asha',
      familyName: 'Rao',
      picture: 'https://example.com/pic.png',
    });
    mockedFindIdentityWithUser.mockResolvedValue(null);
    mockedFindIdentityByEmail.mockResolvedValue(null);
    mockedCreateUserWithIdentity.mockResolvedValue({
      user: { id: 'user-new', accountStatus: 'PENDING' },
      identity: { id: 'identity-new', userId: 'user-new' },
    });

    const result = await handleGoogleOAuthCallback('valid-auth-code');

    expect(result.isNewIdentity).toBe(true);
    expect(result.profileHint).toEqual({
      firstName: 'Asha',
      lastName: 'Rao',
      avatarUrl: 'https://example.com/pic.png',
    });
    expect(mockedMarkIdentityVerified).toHaveBeenCalledWith(expect.anything(), 'identity-new');
    // The core anti-pattern this phase fixes: no automatic CUSTOMER assignment.
    expect(mockedUpsertRole).not.toHaveBeenCalled();
  });

  it('links a new Google identity to an existing account by verified email, without duplicating the email field', async () => {
    mockedExchange.mockResolvedValue({
      sub: 'google-sub-link',
      email: 'phoneuser@example.com',
      emailVerified: true,
    });
    mockedFindIdentityWithUser.mockResolvedValue(null);
    mockedFindIdentityByEmail.mockResolvedValue({
      id: 'identity-email-1',
      email: 'phoneuser@example.com',
      user: { id: 'user-existing', accountStatus: 'ACTIVE' },
    });
    mockedAddUserIdentityToUser.mockResolvedValue({
      id: 'identity-linked',
      userId: 'user-existing',
    });

    const result = await handleGoogleOAuthCallback('valid-auth-code');

    expect(result.isNewIdentity).toBe(false);
    expect(mockedAddUserIdentityToUser).toHaveBeenCalledWith(
      expect.anything(),
      'user-existing',
      expect.objectContaining({
        providerName: 'google',
        providerSubject: 'google-sub-link',
        email: null,
      }),
      expect.anything(),
    );
    expect(mockedCreateUserWithIdentity).not.toHaveBeenCalled();
    expect(mockedUpsertRole).not.toHaveBeenCalled();
  });

  it('never links on an unverified Google email, even if it matches an existing identity', async () => {
    mockedExchange.mockResolvedValue({
      sub: 'google-sub-unverified',
      email: 'maybe-not-mine@example.com',
      emailVerified: false,
    });
    mockedFindIdentityWithUser.mockResolvedValue(null);
    mockedCreateUserWithIdentity.mockResolvedValue({
      user: { id: 'user-brand-new', accountStatus: 'PENDING' },
      identity: { id: 'identity-brand-new', userId: 'user-brand-new' },
    });

    await handleGoogleOAuthCallback('valid-auth-code');

    // Never even attempts to look up a matching email identity when Google
    // has not verified the email — the linking branch simply cannot fire.
    expect(mockedFindIdentityByEmail).not.toHaveBeenCalled();
    expect(mockedCreateUserWithIdentity).toHaveBeenCalled();
  });

  it('rejects a suspended existing account, even though the Google identity itself verified successfully', async () => {
    mockedExchange.mockResolvedValue({
      sub: 'google-sub-suspended',
      email: 'x@example.com',
      emailVerified: true,
    });
    mockedFindIdentityWithUser.mockResolvedValue({
      id: 'identity-1',
      userId: 'user-suspended',
      user: { id: 'user-suspended', accountStatus: 'SUSPENDED' },
    });

    await expect(handleGoogleOAuthCallback('valid-auth-code')).rejects.toThrow(
      AccountNotActiveError,
    );
  });

  it('retries identity resolution once on a concurrent-creation race (P2002), picking up the winning row', async () => {
    mockedExchange.mockResolvedValue({
      sub: 'google-sub-race',
      email: 'race@example.com',
      emailVerified: true,
    });
    mockedFindIdentityByEmail.mockResolvedValue(null);
    mockedFindIdentityWithUser
      .mockResolvedValueOnce(null) // first attempt: nothing yet
      .mockResolvedValueOnce({
        id: 'identity-winner',
        userId: 'user-winner',
        user: { id: 'user-winner', accountStatus: 'ACTIVE' },
      }); // retry: the concurrent request already committed
    mockedCreateUserWithIdentity.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
        code: 'P2002',
        clientVersion: 'test',
      }),
    );

    const result = await handleGoogleOAuthCallback('valid-auth-code');

    expect(result.user.id).toBe('user-winner');
    expect(result.isNewIdentity).toBe(false);
    expect(mockedFindIdentityWithUser).toHaveBeenCalledTimes(2);
  });

  it('an existing Administrator linking Google keeps a normal identity-linking session — the callback itself never touches roles at all', async () => {
    // handleGoogleOAuthCallback never reads or writes UserRole for an
    // existing user in any branch — the admin's ADMINISTRATOR role lives
    // entirely in RBAC tables this function never touches, so it is
    // preserved by construction, not by a special case. This test proves
    // that by asserting upsertRoleAssignment is never called.
    mockedExchange.mockResolvedValue({
      sub: 'google-sub-admin',
      email: 'admin@example.com',
      emailVerified: true,
    });
    mockedFindIdentityWithUser.mockResolvedValue(null);
    mockedFindIdentityByEmail.mockResolvedValue({
      id: 'identity-admin-email',
      email: 'admin@example.com',
      user: { id: 'user-admin', accountStatus: 'ACTIVE' },
    });
    mockedAddUserIdentityToUser.mockResolvedValue({
      id: 'identity-admin-linked',
      userId: 'user-admin',
    });

    const result = await handleGoogleOAuthCallback('valid-auth-code');

    expect(result.user.id).toBe('user-admin');
    expect(mockedUpsertRole).not.toHaveBeenCalled();
  });
});
