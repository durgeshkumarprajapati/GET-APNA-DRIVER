import 'server-only';
import type { EmailVerificationToken, OtpChallenge, PasswordResetToken } from '@prisma/client';
import type { Db } from '@/shared/database/prisma';

// ---------------------------------------------------------------------------
// Email Verification Tokens
// ---------------------------------------------------------------------------

export interface CreateEmailVerificationTokenData {
  userId: string;
  identityId: string;
  tokenHash: string;
  expiresAt: Date;
}

export async function createEmailVerificationToken(
  db: Db,
  data: CreateEmailVerificationTokenData,
): Promise<EmailVerificationToken> {
  return db.emailVerificationToken.create({
    data: {
      userId: data.userId,
      identityId: data.identityId,
      tokenHash: data.tokenHash,
      expiresAt: data.expiresAt,
    },
  });
}

export async function findEmailVerificationTokenByHash(
  db: Db,
  tokenHash: string,
): Promise<EmailVerificationToken | null> {
  return db.emailVerificationToken.findUnique({
    where: { tokenHash },
  });
}

export async function markEmailVerificationTokenUsed(db: Db, id: string): Promise<void> {
  await db.emailVerificationToken.update({
    where: { id },
    data: { usedAt: new Date() },
  });
}

// ---------------------------------------------------------------------------
// Password Reset Tokens
// ---------------------------------------------------------------------------

export interface CreatePasswordResetTokenData {
  userId: string;
  tokenHash: string;
  expiresAt: Date;
}

export async function createPasswordResetToken(
  db: Db,
  data: CreatePasswordResetTokenData,
): Promise<PasswordResetToken> {
  return db.passwordResetToken.create({
    data: {
      userId: data.userId,
      tokenHash: data.tokenHash,
      expiresAt: data.expiresAt,
    },
  });
}

export async function findPasswordResetTokenByHash(
  db: Db,
  tokenHash: string,
): Promise<PasswordResetToken | null> {
  return db.passwordResetToken.findUnique({
    where: { tokenHash },
  });
}

export async function markPasswordResetTokenUsed(db: Db, id: string): Promise<void> {
  await db.passwordResetToken.update({
    where: { id },
    data: { usedAt: new Date() },
  });
}

// ---------------------------------------------------------------------------
// OTP Challenges
// ---------------------------------------------------------------------------

export interface CreateOtpChallengeData {
  phoneNumber: string;
  otpHash: string;
  expiresAt: Date;
  maxAttempts?: number;
}

export async function createOtpChallenge(
  db: Db,
  data: CreateOtpChallengeData,
): Promise<OtpChallenge> {
  return db.otpChallenge.create({
    data: {
      phoneNumber: data.phoneNumber,
      otpHash: data.otpHash,
      expiresAt: data.expiresAt,
      maxAttempts: data.maxAttempts ?? 5,
    },
  });
}

export async function findLatestOtpChallengeByPhone(
  db: Db,
  phoneNumber: string,
): Promise<OtpChallenge | null> {
  return db.otpChallenge.findFirst({
    where: { phoneNumber },
    orderBy: { createdAt: 'desc' },
  });
}

export async function incrementOtpChallengeAttempts(db: Db, id: string): Promise<OtpChallenge> {
  return db.otpChallenge.update({
    where: { id },
    data: { attempts: { increment: 1 } },
  });
}

export async function markOtpChallengeVerified(db: Db, id: string): Promise<void> {
  await db.otpChallenge.update({
    where: { id },
    data: { verifiedAt: new Date() },
  });
}
