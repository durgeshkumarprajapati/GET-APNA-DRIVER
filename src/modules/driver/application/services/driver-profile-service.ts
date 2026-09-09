import 'server-only';
import {
  DriverOnboardingStatus,
  type DriverDocument,
  type DriverProfile,
  type User,
} from '@prisma/client';
import { prisma, type Db } from '@/shared/database/prisma';
import { recordAuditLog } from '@/shared/audit/audit-service';
import { insertOutboxEvent } from '@/shared/outbox/outbox-service';
import { getInteger } from '@/shared/config/configuration-service';
import { getContactInfoForUsers } from '@/modules/identity/infrastructure/user-repository';
import { DriverProfileNotFoundError } from '../../domain/errors';

/**
 * A DriverProfile as returned to admin views: the account (`user`) enriched
 * with its display email/phone, since `User` itself carries no contact
 * fields — those live on UserIdentity (see getContactInfoForUsers).
 */
export type DriverProfileWithContact = DriverProfile & {
  user: User & { email: string | null; phoneNumber: string | null };
  documents: DriverDocument[];
};

export type OwnDriverProfileWithContact = DriverProfile & {
  accountStatus: User['accountStatus'];
  email: string | null;
  phoneNumber: string | null;
};

export interface UpdateDriverProfileInput {
  firstName?: string | null;
  lastName?: string | null;
  displayName?: string | null;
  profileImageUrl?: string | null;
  dateOfBirth?: Date | string | null;
  gender?: string | null;
  bio?: string | null;
  drivingExperienceYears?: number;
  primaryServiceArea?: string | null;
}

/**
 * Retrieves driver profile for a user ID, creating an initial profile if none exists.
 */
export async function getOrCreateDriverProfile(
  userId: string,
  db: Db = prisma,
): Promise<DriverProfile> {
  const existing = await db.driverProfile.findUnique({
    where: { userId },
  });

  if (existing) {
    return existing;
  }

  return await db.driverProfile.create({
    data: {
      userId,
      onboardingStatus: DriverOnboardingStatus.NOT_STARTED,
    },
  });
}

/**
 * Same as `getOrCreateDriverProfile`, enriched with account status and
 * contact info resolved from UserIdentity — for the driver's own "my
 * profile" view, where they need to see their own email/phone.
 */
export async function getOwnDriverProfileWithContact(
  userId: string,
  db: Db = prisma,
): Promise<OwnDriverProfileWithContact> {
  const [profile, user, contactInfo] = await Promise.all([
    getOrCreateDriverProfile(userId, db),
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
 * Updates driver profile details with minimum age validation, audit logging, and outbox event.
 */
export async function updateDriverProfile(
  userId: string,
  input: UpdateDriverProfileInput,
  requestMetadata?: Record<string, unknown> | null,
  dbClient: Db = prisma,
): Promise<DriverProfile> {
  let dob: Date | null | undefined = undefined;

  if (input.dateOfBirth !== undefined) {
    if (input.dateOfBirth === null) {
      dob = null;
    } else {
      dob = new Date(input.dateOfBirth);
      if (isNaN(dob.getTime())) {
        throw new Error('Invalid dateOfBirth provided.');
      }
      const minAge = await getInteger('driver.onboarding.minimum_age', 18, dbClient);
      const minAgeDate = new Date();
      minAgeDate.setFullYear(minAgeDate.getFullYear() - minAge);

      if (dob > minAgeDate) {
        throw new Error(`Driver must be at least ${minAge} years old.`);
      }
    }
  }

  return await dbClient.$transaction(async (tx) => {
    const current = await getOrCreateDriverProfile(userId, tx);

    const nextOnboardingStatus =
      current.onboardingStatus === DriverOnboardingStatus.NOT_STARTED
        ? DriverOnboardingStatus.IN_PROGRESS
        : current.onboardingStatus;

    const updated = await tx.driverProfile.update({
      where: { userId },
      data: {
        ...(input.firstName !== undefined && { firstName: input.firstName }),
        ...(input.lastName !== undefined && { lastName: input.lastName }),
        ...(input.displayName !== undefined && { displayName: input.displayName }),
        ...(input.profileImageUrl !== undefined && { profileImageUrl: input.profileImageUrl }),
        ...(dob !== undefined && { dateOfBirth: dob }),
        ...(input.gender !== undefined && { gender: input.gender }),
        ...(input.bio !== undefined && { bio: input.bio }),
        ...(input.drivingExperienceYears !== undefined && {
          drivingExperienceYears: input.drivingExperienceYears,
        }),
        ...(input.primaryServiceArea !== undefined && {
          primaryServiceArea: input.primaryServiceArea,
        }),
        onboardingStatus: nextOnboardingStatus,
      },
    });

    await recordAuditLog(tx, {
      actorUserId: userId,
      action: 'driver.profile.updated',
      entityType: 'DriverProfile',
      entityId: updated.id,
      beforeState: {
        firstName: current.firstName,
        lastName: current.lastName,
        onboardingStatus: current.onboardingStatus,
      },
      afterState: {
        firstName: updated.firstName,
        lastName: updated.lastName,
        onboardingStatus: updated.onboardingStatus,
      },
      requestMetadata: requestMetadata ?? null,
    });

    await insertOutboxEvent(tx, {
      eventType: 'driver.profile.updated',
      aggregateType: 'DriverProfile',
      aggregateId: updated.id,
      payload: { userId, driverProfileId: updated.id },
    });

    return updated;
  });
}

/**
 * Retrieves driver profile by driver profile ID or throws DriverProfileNotFoundError.
 */
export async function getDriverProfileById(
  driverProfileId: string,
  db: Db = prisma,
): Promise<DriverProfileWithContact> {
  const profile = await db.driverProfile.findUnique({
    where: { id: driverProfileId },
    include: {
      user: true,
      documents: {
        where: { isCurrent: true },
      },
    },
  });

  if (!profile) {
    throw new DriverProfileNotFoundError(driverProfileId);
  }

  const contactByUserId = await getContactInfoForUsers(db, [profile.userId]);
  const contact = contactByUserId.get(profile.userId) ?? { email: null, phoneNumber: null };

  return { ...profile, user: { ...profile.user, ...contact } };
}
