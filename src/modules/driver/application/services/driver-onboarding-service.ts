import 'server-only';
import {
  DriverApprovalStatus,
  DriverAvailabilityStatus,
  DriverDocumentStatus,
  DriverOnboardingStatus,
  DriverVerificationStatus,
  type DriverProfile,
} from '@prisma/client';
import { prisma, type Db } from '@/shared/database/prisma';
import { recordAuditLog } from '@/shared/audit/audit-service';
import { insertOutboxEvent } from '@/shared/outbox/outbox-service';
import { getJson } from '@/shared/config/configuration-service';
import { getContactInfoForUsers } from '@/modules/identity/infrastructure/user-repository';
import {
  DriverProfileNotFoundError,
  InvalidDriverStatusTransitionError,
} from '../../domain/errors';
import { getOrCreateDriverProfile, type DriverProfileWithContact } from './driver-profile-service';

/**
 * Submits driver profile and documents for administrative review.
 */
export async function submitOnboarding(
  userId: string,
  requestMetadata?: Record<string, unknown> | null,
  dbClient: Db = prisma,
): Promise<DriverProfile> {
  return await dbClient.$transaction(async (tx) => {
    const profile = await getOrCreateDriverProfile(userId, tx);

    if (
      profile.onboardingStatus !== DriverOnboardingStatus.IN_PROGRESS &&
      profile.onboardingStatus !== DriverOnboardingStatus.CHANGES_REQUESTED
    ) {
      throw new InvalidDriverStatusTransitionError(
        profile.onboardingStatus,
        DriverOnboardingStatus.SUBMITTED,
        'onboarding status',
      );
    }

    if (
      !profile.firstName ||
      !profile.lastName ||
      !profile.dateOfBirth ||
      !profile.primaryServiceArea ||
      profile.drivingExperienceYears <= 0
    ) {
      throw new Error('Driver profile details must be completed before submission.');
    }

    const requiredDocTypes = await getJson<string[]>(
      'driver.onboarding.required_documents',
      ['DRIVING_LICENSE', 'AADHAAR_CARD'],
      tx,
    );

    const docs = await tx.driverDocument.findMany({
      where: { driverProfileId: profile.id, isCurrent: true },
    });

    for (const reqType of requiredDocTypes) {
      const exists = docs.some((d) => d.documentType === reqType);
      if (!exists) {
        throw new Error(`Required document '${reqType}' is missing.`);
      }
    }

    const updated = await tx.driverProfile.update({
      where: { id: profile.id },
      data: {
        onboardingStatus: DriverOnboardingStatus.SUBMITTED,
        verificationStatus: DriverVerificationStatus.PENDING_VERIFICATION,
        changesRequestedReason: null,
      },
    });

    await tx.driverOnboardingLog.create({
      data: {
        driverProfileId: profile.id,
        actorUserId: userId,
        fromStatus: profile.onboardingStatus,
        toStatus: DriverOnboardingStatus.SUBMITTED,
        action: 'driver.onboarding.submitted',
      },
    });

    await recordAuditLog(tx, {
      actorUserId: userId,
      action: 'driver.onboarding.submitted',
      entityType: 'DriverProfile',
      entityId: profile.id,
      beforeState: { onboardingStatus: profile.onboardingStatus },
      afterState: { onboardingStatus: updated.onboardingStatus },
      requestMetadata: requestMetadata ?? null,
    });

    await insertOutboxEvent(tx, {
      eventType: 'driver.onboarding.submitted',
      aggregateType: 'DriverProfile',
      aggregateId: profile.id,
      payload: { userId, driverProfileId: profile.id },
    });

    return updated;
  });
}

/**
 * Admin action to mark driver onboarding as under active review.
 */
export async function reviewOnboarding(
  adminUserId: string,
  driverProfileId: string,
  requestMetadata?: Record<string, unknown> | null,
  dbClient: Db = prisma,
): Promise<DriverProfile> {
  return await dbClient.$transaction(async (tx) => {
    const profile = await tx.driverProfile.findUnique({ where: { id: driverProfileId } });

    if (!profile) {
      throw new DriverProfileNotFoundError(driverProfileId);
    }

    if (profile.onboardingStatus !== DriverOnboardingStatus.SUBMITTED) {
      throw new InvalidDriverStatusTransitionError(
        profile.onboardingStatus,
        DriverOnboardingStatus.UNDER_REVIEW,
      );
    }

    const updated = await tx.driverProfile.update({
      where: { id: driverProfileId },
      data: {
        onboardingStatus: DriverOnboardingStatus.UNDER_REVIEW,
      },
    });

    await tx.driverOnboardingLog.create({
      data: {
        driverProfileId,
        actorUserId: adminUserId,
        fromStatus: profile.onboardingStatus,
        toStatus: DriverOnboardingStatus.UNDER_REVIEW,
        action: 'driver.onboarding.under_review',
      },
    });

    await recordAuditLog(tx, {
      actorUserId: adminUserId,
      action: 'driver.onboarding.under_review',
      entityType: 'DriverProfile',
      entityId: driverProfileId,
      beforeState: { onboardingStatus: profile.onboardingStatus },
      afterState: { onboardingStatus: updated.onboardingStatus },
      requestMetadata: requestMetadata ?? null,
    });

    return updated;
  });
}

/**
 * Admin action to request changes from driver during review.
 */
export async function requestChanges(
  adminUserId: string,
  driverProfileId: string,
  reason: string,
  requestMetadata?: Record<string, unknown> | null,
  dbClient: Db = prisma,
): Promise<DriverProfile> {
  if (!reason || reason.trim().length === 0) {
    throw new Error('Reason is required when requesting changes.');
  }

  return await dbClient.$transaction(async (tx) => {
    const profile = await tx.driverProfile.findUnique({ where: { id: driverProfileId } });

    if (!profile) {
      throw new DriverProfileNotFoundError(driverProfileId);
    }

    if (profile.onboardingStatus !== DriverOnboardingStatus.UNDER_REVIEW) {
      throw new InvalidDriverStatusTransitionError(
        profile.onboardingStatus,
        DriverOnboardingStatus.CHANGES_REQUESTED,
      );
    }

    const updated = await tx.driverProfile.update({
      where: { id: driverProfileId },
      data: {
        onboardingStatus: DriverOnboardingStatus.CHANGES_REQUESTED,
        changesRequestedReason: reason,
      },
    });

    await tx.driverOnboardingLog.create({
      data: {
        driverProfileId,
        actorUserId: adminUserId,
        fromStatus: profile.onboardingStatus,
        toStatus: DriverOnboardingStatus.CHANGES_REQUESTED,
        action: 'driver.onboarding.changes_requested',
        reason,
      },
    });

    await recordAuditLog(tx, {
      actorUserId: adminUserId,
      action: 'driver.onboarding.changes_requested',
      entityType: 'DriverProfile',
      entityId: driverProfileId,
      beforeState: { onboardingStatus: profile.onboardingStatus },
      afterState: { onboardingStatus: updated.onboardingStatus, reason },
      requestMetadata: requestMetadata ?? null,
    });

    await insertOutboxEvent(tx, {
      eventType: 'driver.onboarding.changes_requested',
      aggregateType: 'DriverProfile',
      aggregateId: driverProfileId,
      payload: { driverProfileId, reason },
    });

    return updated;
  });
}

/**
 * Admin action to approve a driver application after validating all documents are verified.
 */
export async function approveDriver(
  adminUserId: string,
  driverProfileId: string,
  requestMetadata?: Record<string, unknown> | null,
  dbClient: Db = prisma,
): Promise<DriverProfile> {
  return await dbClient.$transaction(async (tx) => {
    const profile = await tx.driverProfile.findUnique({
      where: { id: driverProfileId },
      include: {
        documents: { where: { isCurrent: true } },
      },
    });

    if (!profile) {
      throw new DriverProfileNotFoundError(driverProfileId);
    }

    const requiredDocTypes = await getJson<string[]>(
      'driver.onboarding.required_documents',
      ['DRIVING_LICENSE', 'AADHAAR_CARD'],
      tx,
    );

    for (const reqType of requiredDocTypes) {
      const doc = profile.documents.find((d) => d.documentType === reqType);
      if (!doc || doc.status !== DriverDocumentStatus.VERIFIED) {
        throw new Error(
          `Cannot approve driver: required document '${reqType}' is missing or not verified.`,
        );
      }
    }

    const updated = await tx.driverProfile.update({
      where: { id: driverProfileId },
      data: {
        onboardingStatus: DriverOnboardingStatus.COMPLETED,
        verificationStatus: DriverVerificationStatus.VERIFIED,
        approvalStatus: DriverApprovalStatus.APPROVED,
        approvedAt: new Date(),
        approvedBy: adminUserId,
        rejectionReason: null,
      },
    });

    await tx.driverOnboardingLog.create({
      data: {
        driverProfileId,
        actorUserId: adminUserId,
        fromStatus: profile.approvalStatus,
        toStatus: DriverApprovalStatus.APPROVED,
        action: 'driver.approved',
      },
    });

    await recordAuditLog(tx, {
      actorUserId: adminUserId,
      action: 'driver.approved',
      entityType: 'DriverProfile',
      entityId: driverProfileId,
      beforeState: { approvalStatus: profile.approvalStatus },
      afterState: { approvalStatus: updated.approvalStatus },
      requestMetadata: requestMetadata ?? null,
    });

    await insertOutboxEvent(tx, {
      eventType: 'driver.approved',
      aggregateType: 'DriverProfile',
      aggregateId: driverProfileId,
      payload: { driverProfileId, approvedBy: adminUserId },
    });

    return updated;
  });
}

/**
 * Admin action to reject a driver application with reason.
 */
export async function rejectDriver(
  adminUserId: string,
  driverProfileId: string,
  reason: string,
  requestMetadata?: Record<string, unknown> | null,
  dbClient: Db = prisma,
): Promise<DriverProfile> {
  if (!reason || reason.trim().length === 0) {
    throw new Error('Reason is required when rejecting a driver application.');
  }

  return await dbClient.$transaction(async (tx) => {
    const profile = await tx.driverProfile.findUnique({ where: { id: driverProfileId } });

    if (!profile) {
      throw new DriverProfileNotFoundError(driverProfileId);
    }

    const updated = await tx.driverProfile.update({
      where: { id: driverProfileId },
      data: {
        approvalStatus: DriverApprovalStatus.REJECTED,
        verificationStatus: DriverVerificationStatus.REJECTED,
        availabilityStatus: DriverAvailabilityStatus.OFFLINE,
        rejectionReason: reason,
      },
    });

    await tx.driverOnboardingLog.create({
      data: {
        driverProfileId,
        actorUserId: adminUserId,
        fromStatus: profile.approvalStatus,
        toStatus: DriverApprovalStatus.REJECTED,
        action: 'driver.rejected',
        reason,
      },
    });

    await recordAuditLog(tx, {
      actorUserId: adminUserId,
      action: 'driver.rejected',
      entityType: 'DriverProfile',
      entityId: driverProfileId,
      beforeState: { approvalStatus: profile.approvalStatus },
      afterState: { approvalStatus: updated.approvalStatus, reason },
      requestMetadata: requestMetadata ?? null,
    });

    await insertOutboxEvent(tx, {
      eventType: 'driver.rejected',
      aggregateType: 'DriverProfile',
      aggregateId: driverProfileId,
      payload: { driverProfileId, reason },
    });

    return updated;
  });
}

/**
 * Admin action to suspend driver approval. Forces availability status to OFFLINE.
 */
export async function suspendDriver(
  adminUserId: string,
  driverProfileId: string,
  reason: string,
  requestMetadata?: Record<string, unknown> | null,
  dbClient: Db = prisma,
): Promise<DriverProfile> {
  if (!reason || reason.trim().length === 0) {
    throw new Error('Reason is required when suspending a driver.');
  }

  return await dbClient.$transaction(async (tx) => {
    const profile = await tx.driverProfile.findUnique({ where: { id: driverProfileId } });

    if (!profile) {
      throw new DriverProfileNotFoundError(driverProfileId);
    }

    const updated = await tx.driverProfile.update({
      where: { id: driverProfileId },
      data: {
        approvalStatus: DriverApprovalStatus.SUSPENDED,
        availabilityStatus: DriverAvailabilityStatus.OFFLINE,
        rejectionReason: reason,
      },
    });

    await tx.driverOnboardingLog.create({
      data: {
        driverProfileId,
        actorUserId: adminUserId,
        fromStatus: profile.approvalStatus,
        toStatus: DriverApprovalStatus.SUSPENDED,
        action: 'driver.suspended',
        reason,
      },
    });

    await recordAuditLog(tx, {
      actorUserId: adminUserId,
      action: 'driver.suspended',
      entityType: 'DriverProfile',
      entityId: driverProfileId,
      beforeState: { approvalStatus: profile.approvalStatus },
      afterState: { approvalStatus: updated.approvalStatus, reason },
      requestMetadata: requestMetadata ?? null,
    });

    await insertOutboxEvent(tx, {
      eventType: 'driver.suspended',
      aggregateType: 'DriverProfile',
      aggregateId: driverProfileId,
      payload: { driverProfileId, reason },
    });

    return updated;
  });
}

export interface ListDriverApplicationsFilters {
  onboardingStatus?: DriverOnboardingStatus;
  approvalStatus?: DriverApprovalStatus;
  verificationStatus?: DriverVerificationStatus;
  availabilityStatus?: DriverAvailabilityStatus;
  /** Matches against first name, last name, and display name (case-insensitive). */
  search?: string;
  page?: number;
  pageSize?: number;
}

export interface ListDriverApplicationsResult {
  drivers: DriverProfileWithContact[];
  total: number;
  page: number;
  pageSize: number;
}

/**
 * Administrative query listing driver applications/profiles with status
 * filters, name search, and pagination — the backing query for the admin
 * driver directory. Enriches each result with contact info (see
 * getContactInfoForUsers) in one bulk lookup rather than N+1 queries.
 */
export async function listDriverApplications(
  filters: ListDriverApplicationsFilters = {},
  db: Db = prisma,
): Promise<ListDriverApplicationsResult> {
  const page = filters.page && filters.page > 0 ? filters.page : 1;
  const pageSize = filters.pageSize && filters.pageSize > 0 ? Math.min(filters.pageSize, 100) : 25;

  const where = {
    ...(filters.onboardingStatus ? { onboardingStatus: filters.onboardingStatus } : {}),
    ...(filters.approvalStatus ? { approvalStatus: filters.approvalStatus } : {}),
    ...(filters.verificationStatus ? { verificationStatus: filters.verificationStatus } : {}),
    ...(filters.availabilityStatus ? { availabilityStatus: filters.availabilityStatus } : {}),
    ...(filters.search
      ? {
          OR: [
            { firstName: { contains: filters.search, mode: 'insensitive' as const } },
            { lastName: { contains: filters.search, mode: 'insensitive' as const } },
            { displayName: { contains: filters.search, mode: 'insensitive' as const } },
          ],
        }
      : {}),
  };

  const [drivers, total] = await Promise.all([
    db.driverProfile.findMany({
      where,
      include: { user: true, documents: { where: { isCurrent: true } } },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    db.driverProfile.count({ where }),
  ]);

  const contactByUserId = await getContactInfoForUsers(
    db,
    drivers.map((driver) => driver.userId),
  );

  return {
    drivers: drivers.map((driver) => ({
      ...driver,
      user: {
        ...driver.user,
        ...(contactByUserId.get(driver.userId) ?? { email: null, phoneNumber: null }),
      },
    })),
    total,
    page,
    pageSize,
  };
}
