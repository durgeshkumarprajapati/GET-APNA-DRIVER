import 'server-only';
import type { UserCredential } from '@prisma/client';
import type { Db } from '@/shared/database/prisma';

export async function createUserCredential(
  db: Db,
  userId: string,
  passwordHash: string,
  algorithm = 'argon2id',
): Promise<UserCredential> {
  return db.userCredential.create({
    data: {
      userId,
      passwordHash,
      algorithm,
    },
  });
}

export async function findUserCredentialByUserId(
  db: Db,
  userId: string,
): Promise<UserCredential | null> {
  return db.userCredential.findUnique({
    where: { userId },
  });
}

export async function updateUserCredentialPassword(
  db: Db,
  userId: string,
  passwordHash: string,
): Promise<UserCredential> {
  return db.userCredential.upsert({
    where: { userId },
    create: {
      userId,
      passwordHash,
    },
    update: {
      passwordHash,
      passwordVersion: { increment: 1 },
    },
  });
}
