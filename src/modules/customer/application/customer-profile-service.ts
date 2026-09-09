import 'server-only';
import type { AccountStatus, CustomerProfile } from '@prisma/client';
import { prisma, type Db } from '@/shared/database/prisma';
import { recordAuditLog } from '@/shared/audit/audit-service';
import { insertOutboxEvent } from '@/shared/outbox/outbox-service';
import { getContactInfoForUsers } from '@/modules/identity/infrastructure/user-repository';

export type CustomerProfileWithContact = CustomerProfile & {
  accountStatus: AccountStatus;
  email: string | null;
  phoneNumber: string | null;
};

export interface UpdateCustomerProfileInput {
  firstName?: string | null;
  lastName?: string | null;
  displayName?: string | null;
  avatarUrl?: string | null;
  dateOfBirth?: Date | string | null;
}

/**
 * Retrieves customer profile for a given user ID, creating a default empty profile if none exists.
 */
export async function getOrCreateCustomerProfile(
  userId: string,
  db: Db = prisma,
): Promise<CustomerProfile> {
  const existing = await db.customerProfile.findUnique({
    where: { userId },
  });

  if (existing) {
    return existing;
  }

  return await db.customerProfile.create({
    data: {
      userId,
    },
  });
}

/**
 * Same as `getOrCreateCustomerProfile`, enriched with account status and
 * contact info resolved from UserIdentity (User itself carries neither) —
 * for self-service "my profile" views where the customer needs to see their
 * own email/phone, not just profile-table fields.
 */
export async function getOwnCustomerProfileWithContact(
  userId: string,
  db: Db = prisma,
): Promise<CustomerProfileWithContact> {
  const [profile, user, contactInfo] = await Promise.all([
    getOrCreateCustomerProfile(userId, db),
    db.user.findUniqueOrThrow({ where: { id: userId } }),
    getContactInfoForUsers(db, [userId]),
  ]);

  return {
    ...profile,
    accountStatus: user.accountStatus,
    ...(contactInfo.get(userId) ?? { email: null, phoneNumber: null }),
  };
}

/**
 * Updates customer profile details within a database transaction, with audit log and outbox event.
 */
export async function updateCustomerProfile(
  userId: string,
  input: UpdateCustomerProfileInput,
  requestMetadata?: Record<string, unknown> | null,
  dbClient: Db = prisma,
): Promise<CustomerProfile> {
  let dob: Date | null | undefined = undefined;
  if (input.dateOfBirth !== undefined) {
    if (input.dateOfBirth === null) {
      dob = null;
    } else {
      dob = new Date(input.dateOfBirth);
      if (isNaN(dob.getTime())) {
        throw new Error('Invalid dateOfBirth provided');
      }
      if (dob > new Date()) {
        throw new Error('dateOfBirth cannot be in the future');
      }
    }
  }

  return await dbClient.$transaction(async (tx) => {
    const current = await getOrCreateCustomerProfile(userId, tx);

    const updated = await tx.customerProfile.update({
      where: { userId },
      data: {
        ...(input.firstName !== undefined && { firstName: input.firstName }),
        ...(input.lastName !== undefined && { lastName: input.lastName }),
        ...(input.displayName !== undefined && { displayName: input.displayName }),
        ...(input.avatarUrl !== undefined && { avatarUrl: input.avatarUrl }),
        ...(dob !== undefined && { dateOfBirth: dob }),
      },
    });

    await recordAuditLog(tx, {
      actorUserId: userId,
      action: 'customer.profile.updated',
      entityType: 'CustomerProfile',
      entityId: updated.id,
      beforeState: {
        firstName: current.firstName,
        lastName: current.lastName,
        displayName: current.displayName,
      },
      afterState: {
        firstName: updated.firstName,
        lastName: updated.lastName,
        displayName: updated.displayName,
      },
      requestMetadata: requestMetadata ?? null,
    });

    await insertOutboxEvent(tx, {
      eventType: 'customer.profile.updated',
      aggregateType: 'CustomerProfile',
      aggregateId: updated.id,
      payload: { userId, profileId: updated.id },
    });

    return updated;
  });
}
