import 'server-only';
import { cookies } from 'next/headers';
import type { User, UserSession } from '@prisma/client';
import { prisma, type Db } from '@/shared/database/prisma';
import { env } from '@/shared/config/env';
import { recordAuditLog } from '@/shared/audit/audit-service';
import { insertOutboxEvent } from '@/shared/outbox/outbox-service';
import { generateRandomToken, hashToken } from '../../security/tokens';
import * as sessionRepository from '../../infrastructure/session-repository';

export interface CreatedSessionResult {
  session: UserSession;
  rawToken: string;
}

export interface ValidatedSessionResult {
  session: UserSession;
  user: User;
}

/**
 * Creates a new server-authoritative session for a user, returns the raw token,
 * and sets the secure HttpOnly cookie.
 */
export async function createSessionForUser(
  userId: string,
  requestMetadata?: { ipAddress?: string | null; userAgent?: string | null },
): Promise<CreatedSessionResult> {
  const rawToken = generateRandomToken(32);
  const tokenHash = hashToken(rawToken);
  const expiresAt = new Date(Date.now() + env.AUTH_SESSION_TTL_SECONDS * 1000);

  const session = await prisma.$transaction(async (tx: Db) => {
    const created = await sessionRepository.createUserSession(tx, {
      userId,
      sessionTokenHash: tokenHash,
      expiresAt,
      ipAddress: requestMetadata?.ipAddress ?? null,
      userAgent: requestMetadata?.userAgent ?? null,
    });

    await recordAuditLog(tx, {
      actorUserId: userId,
      action: 'identity.session.created',
      entityType: 'UserSession',
      entityId: created.id,
      beforeState: null,
      afterState: {
        userId,
        expiresAt: expiresAt.toISOString(),
        ipAddress: requestMetadata?.ipAddress ?? null,
      },
      requestMetadata: requestMetadata ? { ...requestMetadata } : null,
    });

    await insertOutboxEvent(tx, {
      eventType: 'identity.session_created',
      aggregateType: 'UserSession',
      aggregateId: created.id,
      payload: { userId, sessionId: created.id, expiresAt: expiresAt.toISOString() },
    });

    return created;
  });

  await setSessionCookie(rawToken, expiresAt);

  return { session, rawToken };
}

/**
 * Sets the session cookie using Next.js cookies API.
 */
export async function setSessionCookie(rawToken: string, expiresAt: Date): Promise<void> {
  try {
    const cookieStore = await cookies();
    cookieStore.set(env.AUTH_SESSION_COOKIE_NAME, rawToken, {
      httpOnly: true,
      secure: env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      expires: expiresAt,
    });
  } catch {
    // Expected during non-request contexts or tests where cookies() is unbacked
  }
}

/**
 * Clears the session cookie.
 */
export async function clearSessionCookie(): Promise<void> {
  try {
    const cookieStore = await cookies();
    cookieStore.delete(env.AUTH_SESSION_COOKIE_NAME);
  } catch {
    // Expected during non-request contexts or tests
  }
}

/**
 * Resolves raw session token into a validated session and user record.
 * Returns null if token is missing, expired, revoked, or user is DELETED.
 */
export async function validateSessionToken(
  rawToken: string,
): Promise<ValidatedSessionResult | null> {
  if (!rawToken) {
    return null;
  }

  const tokenHash = hashToken(rawToken);
  const found = await sessionRepository.findSessionByTokenHash(prisma, tokenHash);

  if (!found) {
    return null;
  }

  if (found.revokedAt !== null) {
    return null;
  }

  if (found.expiresAt.getTime() <= Date.now()) {
    return null;
  }

  if (found.user.accountStatus === 'DELETED') {
    return null;
  }

  // Throttle lastUsedAt update (only update if > 5 minutes ago)
  const fiveMinsMs = 5 * 60 * 1000;
  if (Date.now() - found.lastUsedAt.getTime() > fiveMinsMs) {
    void sessionRepository.updateSessionLastUsed(prisma, found.id).catch(() => {});
  }

  return {
    session: found,
    user: found.user,
  };
}

/**
 * Revokes a single session by session ID and clears cookie if it matches current.
 */
export async function revokeSession(sessionId: string, actorUserId?: string | null): Promise<void> {
  await prisma.$transaction(async (tx: Db) => {
    await sessionRepository.revokeSession(tx, sessionId);

    await recordAuditLog(tx, {
      actorUserId: actorUserId ?? null,
      action: 'identity.session.revoked',
      entityType: 'UserSession',
      entityId: sessionId,
      beforeState: null,
      afterState: { revokedAt: new Date().toISOString() },
      requestMetadata: null,
    });

    await insertOutboxEvent(tx, {
      eventType: 'identity.session_revoked',
      aggregateType: 'UserSession',
      aggregateId: sessionId,
      payload: { sessionId, actorUserId: actorUserId ?? null },
    });
  });

  await clearSessionCookie();
}

/**
 * Revokes all sessions for a given user (e.g. on password reset or security event).
 */
export async function revokeAllSessionsForUser(
  userId: string,
  actorUserId?: string | null,
): Promise<void> {
  await prisma.$transaction(async (tx: Db) => {
    await sessionRepository.revokeAllUserSessions(tx, userId);

    await recordAuditLog(tx, {
      actorUserId: actorUserId ?? null,
      action: 'identity.session.revoked_all',
      entityType: 'User',
      entityId: userId,
      beforeState: null,
      afterState: { revokedAllAt: new Date().toISOString() },
      requestMetadata: null,
    });

    await insertOutboxEvent(tx, {
      eventType: 'identity.all_sessions_revoked',
      aggregateType: 'User',
      aggregateId: userId,
      payload: { userId, actorUserId: actorUserId ?? null },
    });
  });

  await clearSessionCookie();
}
