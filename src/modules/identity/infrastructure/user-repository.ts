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

export interface UserContactInfo {
  email: string | null;
  phoneNumber: string | null;
}

/**
 * Bulk-resolves the display email/phone for a set of users from their
 * UserIdentity rows (User itself carries no contact fields — those live on
 * UserIdentity, one row per sign-in method). Used by admin-facing views that
 * need to show a user's contact info alongside their profile.
 */
export async function getContactInfoForUsers(
  db: Db,
  userIds: string[],
): Promise<Map<string, UserContactInfo>> {
  const result = new Map<string, UserContactInfo>();
  if (userIds.length === 0) {
    return result;
  }

  const identities = await db.userIdentity.findMany({
    where: { userId: { in: userIds }, providerName: { in: ['email', 'phone'] } },
    select: { userId: true, providerName: true, email: true, phoneNumber: true },
  });

  for (const identity of identities) {
    const existing = result.get(identity.userId) ?? { email: null, phoneNumber: null };
    if (identity.providerName === 'email' && identity.email) {
      existing.email = identity.email;
    }
    if (identity.providerName === 'phone' && identity.phoneNumber) {
      existing.phoneNumber = identity.phoneNumber;
    }
    result.set(identity.userId, existing);
  }

  return result;
}
