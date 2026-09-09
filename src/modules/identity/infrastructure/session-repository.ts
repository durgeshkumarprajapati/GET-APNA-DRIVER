import 'server-only';
import type { User, UserSession } from '@prisma/client';
import type { Db } from '@/shared/database/prisma';

export interface CreateUserSessionData {
  userId: string;
  sessionTokenHash: string;
  expiresAt: Date;
  ipAddress?: string | null;
  userAgent?: string | null;
}

export async function createUserSession(db: Db, data: CreateUserSessionData): Promise<UserSession> {
  return db.userSession.create({
    data: {
      userId: data.userId,
      sessionTokenHash: data.sessionTokenHash,
      expiresAt: data.expiresAt,
      ipAddress: data.ipAddress,
      userAgent: data.userAgent,
    },
  });
}

export async function findSessionByTokenHash(
  db: Db,
  tokenHash: string,
): Promise<(UserSession & { user: User }) | null> {
  return db.userSession.findUnique({
    where: { sessionTokenHash: tokenHash },
    include: { user: true },
  });
}

export async function updateSessionLastUsed(
  db: Db,
  sessionId: string,
  lastUsedAt = new Date(),
): Promise<void> {
  await db.userSession.update({
    where: { id: sessionId },
    data: { lastUsedAt },
  });
}

export async function revokeSession(db: Db, sessionId: string): Promise<void> {
  await db.userSession.update({
    where: { id: sessionId },
    data: { revokedAt: new Date() },
  });
}

export async function revokeAllUserSessions(db: Db, userId: string): Promise<void> {
  await db.userSession.updateMany({
    where: {
      userId,
      revokedAt: null,
    },
    data: { revokedAt: new Date() },
  });
}
