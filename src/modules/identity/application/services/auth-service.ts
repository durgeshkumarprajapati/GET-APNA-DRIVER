import 'server-only';
import type { User, UserIdentity, UserSession } from '@prisma/client';
import { prisma, type Db } from '@/shared/database/prisma';
import { recordAuditLog } from '@/shared/audit/audit-service';
import { insertOutboxEvent } from '@/shared/outbox/outbox-service';
import { normalizeEmail, isValidEmail } from '../../validation/email';
import { normalizePhoneNumber, isValidE164PhoneNumber } from '../../validation/phone';
import { hashPassword, verifyPassword, validatePasswordPolicy } from '../../security/password';
import { generateRandomToken, hashToken } from '../../security/tokens';
import { generateOtp, hashOtp, verifyOtpHash } from '../../security/otp';
import { emailDeliveryProvider } from '../../infrastructure/email-provider';
import { otpDeliveryProvider } from '../../infrastructure/otp-provider';
import { exchangeGoogleCodeForProfile } from '../../infrastructure/oauth-provider';
import * as userRepository from '../../infrastructure/user-repository';
import * as credentialRepository from '../../infrastructure/credential-repository';
import * as tokenRepository from '../../infrastructure/token-repository';
import * as rbacRepository from '../../infrastructure/rbac-repository';
import * as sessionRepository from '../../infrastructure/session-repository';
import { createSessionForUser } from './session-service';
import { SYSTEM_ROLE_CODES } from '../../domain/role-catalog';
import {
  AccountNotActiveError,
  DuplicateIdentityError,
  InvalidCredentialsError,
  InvalidEmailError,
  InvalidPasswordPolicyError,
  InvalidPhoneNumberError,
  InvalidTokenError,
  OtpExpiredError,
  OtpInvalidError,
  OtpMaxAttemptsExceededError,
  TokenExpiredError,
} from '../../domain/errors';

import { getInteger } from '@/shared/config/configuration-service';

export interface AuthSessionResponse {
  user: User;
  identity?: UserIdentity;
  session: UserSession;
  rawSessionToken: string;
}

/**
 * Registers a new user with Email and Password.
 */
export async function registerWithEmailPassword(
  input: { email: string; password: string },
  requestMetadata?: { ipAddress?: string | null; userAgent?: string | null },
): Promise<AuthSessionResponse> {
  const normalizedEmail = normalizeEmail(input.email);
  if (!isValidEmail(normalizedEmail)) {
    throw new InvalidEmailError();
  }

  const policyCheck = validatePasswordPolicy(input.password);
  if (!policyCheck.isValid) {
    throw new InvalidPasswordPolicyError(policyCheck.issues);
  }

  const hashedPassword = await hashPassword(input.password);

  const { user, identity } = await prisma.$transaction(async (tx: Db) => {
    const existing = await userRepository.findIdentityByEmail(tx, normalizedEmail);
    if (existing) {
      throw new DuplicateIdentityError('email');
    }

    const { user: newUser, identity: newIdentity } = await userRepository.createUserWithIdentity(
      tx,
      {
        providerType: 'EMAIL',
        providerName: 'email',
        providerSubject: normalizedEmail,
        email: normalizedEmail,
        phoneNumber: null,
      },
    );

    await credentialRepository.createUserCredential(tx, newUser.id, hashedPassword);

    // Assign default public role: CUSTOMER
    const customerRole = await rbacRepository.findRoleByCode(tx, SYSTEM_ROLE_CODES.CUSTOMER);
    if (customerRole) {
      await rbacRepository.upsertRoleAssignment(tx, {
        userId: newUser.id,
        roleId: customerRole.id,
        assignedBy: null,
      });
    }

    // Generate email verification token (valid 24h)
    const verificationRawToken = generateRandomToken(32);
    const verificationTokenHash = hashToken(verificationRawToken);
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

    await tokenRepository.createEmailVerificationToken(tx, {
      userId: newUser.id,
      identityId: newIdentity.id,
      tokenHash: verificationTokenHash,
      expiresAt,
    });

    await recordAuditLog(tx, {
      actorUserId: null,
      action: 'identity.user_registered',
      entityType: 'User',
      entityId: newUser.id,
      beforeState: null,
      afterState: { email: normalizedEmail, providerName: 'email' },
      requestMetadata: requestMetadata ? { ...requestMetadata } : null,
    });

    await insertOutboxEvent(tx, {
      eventType: 'identity.user_registered',
      aggregateType: 'User',
      aggregateId: newUser.id,
      payload: { userId: newUser.id, email: normalizedEmail },
    });

    // Deliver email asynchronously
    void emailDeliveryProvider
      .sendVerificationEmail(normalizedEmail, verificationRawToken)
      .catch(() => {});

    return { user: newUser, identity: newIdentity };
  });

  const sessionResult = await createSessionForUser(user.id, requestMetadata);

  return {
    user,
    identity,
    session: sessionResult.session,
    rawSessionToken: sessionResult.rawToken,
  };
}

/**
 * Authenticates a user with Email and Password.
 */
export async function loginWithEmailPassword(
  input: { email: string; password: string },
  requestMetadata?: { ipAddress?: string | null; userAgent?: string | null },
): Promise<AuthSessionResponse> {
  const normalizedEmail = normalizeEmail(input.email);
  if (!isValidEmail(normalizedEmail)) {
    throw new InvalidCredentialsError();
  }

  const identityWithUser = await userRepository.findIdentityByEmail(prisma, normalizedEmail);
  if (!identityWithUser) {
    throw new InvalidCredentialsError();
  }

  const user = identityWithUser.user;
  if (['SUSPENDED', 'DEACTIVATED', 'DELETED'].includes(user.accountStatus)) {
    throw new AccountNotActiveError(user.accountStatus);
  }

  const credential = await credentialRepository.findUserCredentialByUserId(prisma, user.id);
  if (!credential) {
    throw new InvalidCredentialsError();
  }

  const passwordValid = await verifyPassword(input.password, credential.passwordHash);
  if (!passwordValid) {
    throw new InvalidCredentialsError();
  }

  const sessionResult = await createSessionForUser(user.id, requestMetadata);

  await prisma.$transaction(async (tx: Db) => {
    await recordAuditLog(tx, {
      actorUserId: user.id,
      action: 'identity.login_success',
      entityType: 'User',
      entityId: user.id,
      beforeState: null,
      afterState: { providerName: 'email' },
      requestMetadata: requestMetadata ? { ...requestMetadata } : null,
    });

    await insertOutboxEvent(tx, {
      eventType: 'identity.login_success',
      aggregateType: 'User',
      aggregateId: user.id,
      payload: { userId: user.id, providerName: 'email' },
    });
  });

  return {
    user,
    identity: identityWithUser,
    session: sessionResult.session,
    rawSessionToken: sessionResult.rawToken,
  };
}

/**
 * Requests a phone OTP for mobile authentication.
 */
export async function requestPhoneOtp(input: {
  phoneNumber: string;
}): Promise<{ expiresAt: Date }> {
  const normalizedPhone = normalizePhoneNumber(input.phoneNumber);
  if (!isValidE164PhoneNumber(normalizedPhone)) {
    throw new InvalidPhoneNumberError();
  }

  const ttlSeconds = await getInteger('identity.otp.ttl_seconds', 300);
  const maxAttempts = await getInteger('identity.otp.max_attempts', 5);

  const otp = generateOtp(6);
  const otpHash = hashOtp(otp);
  const expiresAt = new Date(Date.now() + ttlSeconds * 1000);

  await prisma.$transaction(async (tx: Db) => {
    await tokenRepository.createOtpChallenge(tx, {
      phoneNumber: normalizedPhone,
      otpHash,
      expiresAt,
      maxAttempts,
    });

    await recordAuditLog(tx, {
      actorUserId: null,
      action: 'identity.phone_otp_requested',
      entityType: 'OtpChallenge',
      entityId: normalizedPhone,
      beforeState: null,
      afterState: { phoneNumber: normalizedPhone, expiresAt: expiresAt.toISOString() },
      requestMetadata: null,
    });

    await insertOutboxEvent(tx, {
      eventType: 'identity.phone_otp_requested',
      aggregateType: 'OtpChallenge',
      aggregateId: normalizedPhone,
      payload: { phoneNumber: normalizedPhone },
    });
  });

  void otpDeliveryProvider.sendOtp(normalizedPhone, otp).catch(() => {});

  return { expiresAt };
}

/**
 * Verifies a phone OTP and authenticates or registers the phone identity user.
 */
export async function verifyPhoneOtp(
  input: { phoneNumber: string; otp: string },
  requestMetadata?: { ipAddress?: string | null; userAgent?: string | null },
): Promise<AuthSessionResponse> {
  const normalizedPhone = normalizePhoneNumber(input.phoneNumber);
  if (!isValidE164PhoneNumber(normalizedPhone)) {
    throw new InvalidPhoneNumberError();
  }

  const latestChallenge = await tokenRepository.findLatestOtpChallengeByPhone(
    prisma,
    normalizedPhone,
  );
  if (!latestChallenge || latestChallenge.verifiedAt !== null) {
    throw new OtpInvalidError();
  }

  if (latestChallenge.expiresAt.getTime() <= Date.now()) {
    throw new OtpExpiredError();
  }

  if (latestChallenge.attempts >= latestChallenge.maxAttempts) {
    throw new OtpMaxAttemptsExceededError();
  }

  const isValid = verifyOtpHash(input.otp, latestChallenge.otpHash);
  if (!isValid) {
    await tokenRepository.incrementOtpChallengeAttempts(prisma, latestChallenge.id);
    throw new OtpInvalidError();
  }

  await tokenRepository.markOtpChallengeVerified(prisma, latestChallenge.id);

  const { user, identity } = await prisma.$transaction(async (tx: Db) => {
    const existingIdentity = await userRepository.findIdentityByPhone(tx, normalizedPhone);

    let targetUser: User;
    let targetIdentity: UserIdentity;

    if (existingIdentity) {
      targetUser = existingIdentity.user;
      targetIdentity = existingIdentity;
      if (!targetIdentity.verifiedAt) {
        targetIdentity = await userRepository.markIdentityVerified(tx, targetIdentity.id);
      }
    } else {
      const { user: newUser, identity: newIdentity } = await userRepository.createUserWithIdentity(
        tx,
        {
          providerType: 'PHONE',
          providerName: 'phone',
          providerSubject: normalizedPhone,
          email: null,
          phoneNumber: normalizedPhone,
        },
      );

      await userRepository.markIdentityVerified(tx, newIdentity.id);

      const customerRole = await rbacRepository.findRoleByCode(tx, SYSTEM_ROLE_CODES.CUSTOMER);
      if (customerRole) {
        await rbacRepository.upsertRoleAssignment(tx, {
          userId: newUser.id,
          roleId: customerRole.id,
          assignedBy: null,
        });
      }

      targetUser = newUser;
      targetIdentity = newIdentity;
    }

    if (['SUSPENDED', 'DEACTIVATED', 'DELETED'].includes(targetUser.accountStatus)) {
      throw new AccountNotActiveError(targetUser.accountStatus);
    }

    await recordAuditLog(tx, {
      actorUserId: targetUser.id,
      action: 'identity.phone_verified',
      entityType: 'User',
      entityId: targetUser.id,
      beforeState: null,
      afterState: { phoneNumber: normalizedPhone },
      requestMetadata: requestMetadata ? { ...requestMetadata } : null,
    });

    await insertOutboxEvent(tx, {
      eventType: 'identity.phone_verified',
      aggregateType: 'User',
      aggregateId: targetUser.id,
      payload: { userId: targetUser.id, phoneNumber: normalizedPhone },
    });

    return { user: targetUser, identity: targetIdentity };
  });

  const sessionResult = await createSessionForUser(user.id, requestMetadata);

  return {
    user,
    identity,
    session: sessionResult.session,
    rawSessionToken: sessionResult.rawToken,
  };
}

/**
 * Handles Google OAuth callback code exchange and safe identity resolution/linking.
 */
export async function handleGoogleOAuthCallback(
  code: string,
  requestMetadata?: { ipAddress?: string | null; userAgent?: string | null },
): Promise<AuthSessionResponse> {
  const profile = await exchangeGoogleCodeForProfile(code);

  const { user, identity } = await prisma.$transaction(async (tx: Db) => {
    // 1. Check if OAuth identity already exists
    const existingGoogleIdentity = await userRepository.findIdentityWithUser(
      tx,
      'google',
      profile.sub,
    );

    let targetUser: User;
    let targetIdentity: UserIdentity;

    if (existingGoogleIdentity) {
      targetUser = existingGoogleIdentity.user;
      targetIdentity = existingGoogleIdentity;
    } else {
      // 2. Safe identity linking: check if verified Google email matches existing email identity
      const normalizedEmail = profile.email ? normalizeEmail(profile.email) : null;
      let existingAccountToLink: User | null = null;

      if (normalizedEmail && profile.emailVerified) {
        const existingEmailIdentity = await userRepository.findIdentityByEmail(tx, normalizedEmail);
        if (existingEmailIdentity) {
          existingAccountToLink = existingEmailIdentity.user;
        }
      }

      if (existingAccountToLink) {
        // Link Google identity to existing user account
        targetIdentity = await userRepository.addUserIdentityToUser(
          tx,
          existingAccountToLink.id,
          {
            providerType: 'OAUTH',
            providerName: 'google',
            providerSubject: profile.sub,
            email: normalizedEmail,
            phoneNumber: null,
          },
          profile.emailVerified ? new Date() : null,
        );
        targetUser = existingAccountToLink;
      } else {
        // Create brand new User + Google identity
        const { user: newUser, identity: newIdentity } =
          await userRepository.createUserWithIdentity(tx, {
            providerType: 'OAUTH',
            providerName: 'google',
            providerSubject: profile.sub,
            email: normalizedEmail,
            phoneNumber: null,
          });

        if (profile.emailVerified) {
          await userRepository.markIdentityVerified(tx, newIdentity.id);
        }

        const customerRole = await rbacRepository.findRoleByCode(tx, SYSTEM_ROLE_CODES.CUSTOMER);
        if (customerRole) {
          await rbacRepository.upsertRoleAssignment(tx, {
            userId: newUser.id,
            roleId: customerRole.id,
            assignedBy: null,
          });
        }

        targetUser = newUser;
        targetIdentity = newIdentity;
      }
    }

    if (['SUSPENDED', 'DEACTIVATED', 'DELETED'].includes(targetUser.accountStatus)) {
      throw new AccountNotActiveError(targetUser.accountStatus);
    }

    await recordAuditLog(tx, {
      actorUserId: targetUser.id,
      action: 'identity.google_oauth_success',
      entityType: 'User',
      entityId: targetUser.id,
      beforeState: null,
      afterState: { googleSub: profile.sub, email: profile.email },
      requestMetadata: requestMetadata ? { ...requestMetadata } : null,
    });

    await insertOutboxEvent(tx, {
      eventType: 'identity.google_oauth_success',
      aggregateType: 'User',
      aggregateId: targetUser.id,
      payload: { userId: targetUser.id, googleSub: profile.sub },
    });

    return { user: targetUser, identity: targetIdentity };
  });

  const sessionResult = await createSessionForUser(user.id, requestMetadata);

  return {
    user,
    identity,
    session: sessionResult.session,
    rawSessionToken: sessionResult.rawToken,
  };
}

/**
 * Requests an email verification email for an existing user identity.
 */
export async function requestEmailVerification(userId: string): Promise<void> {
  const user = await userRepository.findUserById(prisma, userId);
  if (!user || user.accountStatus === 'DELETED') {
    return;
  }

  const emailIdentity = await prisma.userIdentity.findFirst({
    where: { userId, providerName: 'email' },
  });

  if (!emailIdentity || !emailIdentity.email) {
    return;
  }

  const verificationRawToken = generateRandomToken(32);
  const verificationTokenHash = hashToken(verificationRawToken);
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

  await prisma.$transaction(async (tx: Db) => {
    await tokenRepository.createEmailVerificationToken(tx, {
      userId,
      identityId: emailIdentity.id,
      tokenHash: verificationTokenHash,
      expiresAt,
    });

    await recordAuditLog(tx, {
      actorUserId: userId,
      action: 'identity.email_verification_requested',
      entityType: 'User',
      entityId: userId,
      beforeState: null,
      afterState: { email: emailIdentity.email },
      requestMetadata: null,
    });

    await insertOutboxEvent(tx, {
      eventType: 'identity.email_verification_requested',
      aggregateType: 'User',
      aggregateId: userId,
      payload: { userId, email: emailIdentity.email },
    });
  });

  void emailDeliveryProvider
    .sendVerificationEmail(emailIdentity.email, verificationRawToken)
    .catch(() => {});
}

/**
 * Verifies email using a raw verification token.
 */
export async function verifyEmailWithToken(rawToken: string): Promise<{ user: User }> {
  const tokenHash = hashToken(rawToken);
  const record = await tokenRepository.findEmailVerificationTokenByHash(prisma, tokenHash);

  if (!record || record.usedAt !== null) {
    throw new InvalidTokenError();
  }

  if (record.expiresAt.getTime() <= Date.now()) {
    throw new TokenExpiredError();
  }

  const updatedUser = await prisma.$transaction(async (tx: Db) => {
    await tokenRepository.markEmailVerificationTokenUsed(tx, record.id);
    await userRepository.markIdentityVerified(tx, record.identityId);

    const user = await userRepository.findUserById(tx, record.userId);
    let finalUser = user!;

    if (user && user.accountStatus === 'PENDING') {
      finalUser = await userRepository.updateAccountStatus(tx, user.id, {
        accountStatus: 'ACTIVE',
      });
    }

    await recordAuditLog(tx, {
      actorUserId: record.userId,
      action: 'identity.email_verified',
      entityType: 'User',
      entityId: record.userId,
      beforeState: { accountStatus: user?.accountStatus },
      afterState: { accountStatus: finalUser.accountStatus },
      requestMetadata: null,
    });

    await insertOutboxEvent(tx, {
      eventType: 'identity.email_verified',
      aggregateType: 'User',
      aggregateId: record.userId,
      payload: { userId: record.userId },
    });

    return finalUser;
  });

  return { user: updatedUser };
}

/**
 * Requests a password reset for an email identity.
 */
export async function requestPasswordReset(email: string): Promise<void> {
  const normalizedEmail = normalizeEmail(email);
  if (!isValidEmail(normalizedEmail)) {
    return; // Generic success return to prevent email enumeration
  }

  const identityWithUser = await userRepository.findIdentityByEmail(prisma, normalizedEmail);
  if (!identityWithUser) {
    return; // Generic success return
  }

  const rawResetToken = generateRandomToken(32);
  const resetTokenHash = hashToken(rawResetToken);
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

  await prisma.$transaction(async (tx: Db) => {
    await tokenRepository.createPasswordResetToken(tx, {
      userId: identityWithUser.userId,
      tokenHash: resetTokenHash,
      expiresAt,
    });

    await recordAuditLog(tx, {
      actorUserId: identityWithUser.userId,
      action: 'identity.password_reset_requested',
      entityType: 'User',
      entityId: identityWithUser.userId,
      beforeState: null,
      afterState: { email: normalizedEmail },
      requestMetadata: null,
    });

    await insertOutboxEvent(tx, {
      eventType: 'identity.password_reset_requested',
      aggregateType: 'User',
      aggregateId: identityWithUser.userId,
      payload: { userId: identityWithUser.userId, email: normalizedEmail },
    });
  });

  void emailDeliveryProvider.sendPasswordResetEmail(normalizedEmail, rawResetToken).catch(() => {});
}

/**
 * Resets a user's password using a valid raw reset token and invalidates all existing sessions.
 */
export async function resetPasswordWithToken(rawToken: string, newPassword: string): Promise<void> {
  const policyCheck = validatePasswordPolicy(newPassword);
  if (!policyCheck.isValid) {
    throw new InvalidPasswordPolicyError(policyCheck.issues);
  }

  const tokenHash = hashToken(rawToken);
  const record = await tokenRepository.findPasswordResetTokenByHash(prisma, tokenHash);

  if (!record || record.usedAt !== null) {
    throw new InvalidTokenError();
  }

  if (record.expiresAt.getTime() <= Date.now()) {
    throw new TokenExpiredError();
  }

  const hashedPassword = await hashPassword(newPassword);

  await prisma.$transaction(async (tx: Db) => {
    await tokenRepository.markPasswordResetTokenUsed(tx, record.id);
    await credentialRepository.updateUserCredentialPassword(tx, record.userId, hashedPassword);
    await sessionRepository.revokeAllUserSessions(tx, record.userId);

    await recordAuditLog(tx, {
      actorUserId: record.userId,
      action: 'identity.password_reset_completed',
      entityType: 'User',
      entityId: record.userId,
      beforeState: null,
      afterState: { passwordResetAt: new Date().toISOString() },
      requestMetadata: null,
    });

    await insertOutboxEvent(tx, {
      eventType: 'identity.password_reset_completed',
      aggregateType: 'User',
      aggregateId: record.userId,
      payload: { userId: record.userId },
    });
  });
}
