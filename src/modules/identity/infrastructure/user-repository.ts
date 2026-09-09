import 'server-only';
import type { AccountStatus, IdentityProviderType, User, UserIdentity } from '@prisma/client';
import type { Db } from '@/shared/database/prisma';

export interface CreateUserWithIdentityData {
  providerType: IdentityProviderType;
  providerName: string;
  providerSubject: string;
  email: string | null;
  phoneNumber: string | null;
}

export interface UpdateAccountStatusData {
  accountStatus: AccountStatus;
  deletedAt?: Date | null;
  deletedBy?: string | null;
}

export async function findUserById(db: Db, userId: string): Promise<User | null> {
  return db.user.findUnique({ where: { id: userId } });
}

export async function findIdentityByProvider(
  db: Db,
  providerName: string,
  providerSubject: string,
): Promise<UserIdentity | null> {
  return db.userIdentity.findUnique({
    where: { provider_identity_unique: { providerName, providerSubject } },
  });
}

export async function createUserWithIdentity(
  db: Db,
  data: CreateUserWithIdentityData,
): Promise<{ user: User; identity: UserIdentity }> {
  const user = await db.user.create({ data: { accountStatus: 'PENDING' } });
  const identity = await db.userIdentity.create({
    data: {
      userId: user.id,
      providerType: data.providerType,
      providerName: data.providerName,
      providerSubject: data.providerSubject,
      email: data.email,
      phoneNumber: data.phoneNumber,
    },
  });
  return { user, identity };
}

export async function updateAccountStatus(
  db: Db,
  userId: string,
  data: UpdateAccountStatusData,
): Promise<User> {
  return db.user.update({ where: { id: userId }, data });
}

export async function findIdentityByEmail(
  db: Db,
  email: string,
): Promise<(UserIdentity & { user: User }) | null> {
  return db.userIdentity.findUnique({
    where: { email },
    include: { user: true },
  });
}

export async function findIdentityByPhone(
  db: Db,
  phoneNumber: string,
): Promise<(UserIdentity & { user: User }) | null> {
  return db.userIdentity.findUnique({
    where: { phoneNumber },
    include: { user: true },
  });
}

export async function findIdentityWithUser(
  db: Db,
  providerName: string,
  providerSubject: string,
): Promise<(UserIdentity & { user: User }) | null> {
  return db.userIdentity.findUnique({
    where: { provider_identity_unique: { providerName, providerSubject } },
    include: { user: true },
  });
}

export async function addUserIdentityToUser(
  db: Db,
  userId: string,
  data: CreateUserWithIdentityData,
  verifiedAt?: Date | null,
): Promise<UserIdentity> {
  return db.userIdentity.create({
    data: {
      userId,
      providerType: data.providerType,
      providerName: data.providerName,
      providerSubject: data.providerSubject,
      email: data.email,
      phoneNumber: data.phoneNumber,
      verifiedAt: verifiedAt ?? null,
    },
  });
}

export async function markIdentityVerified(db: Db, identityId: string): Promise<UserIdentity> {
  return db.userIdentity.update({
    where: { id: identityId },
    data: { verifiedAt: new Date() },
  });
}
