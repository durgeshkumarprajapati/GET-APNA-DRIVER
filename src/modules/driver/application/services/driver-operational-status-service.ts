import 'server-only';
import {
  DriverApprovalStatus,
  DriverAvailabilityStatus,
  DriverDocumentStatus,
  DriverOnboardingStatus,
  DriverVerificationStatus,
} from '@prisma/client';
import { prisma, type Db } from '@/shared/database/prisma';
import { evaluateDriverEligibility } from './driver-eligibility-service';

export type DriverNextAction =
  | 'COMPLETE_PROFILE'
  | 'UPLOAD_DOCUMENTS'
  | 'WAIT_FOR_REVIEW'
  | 'GO_ONLINE'
  | 'NONE';

export interface DriverProfileCompletionDetail {
  status: 'COMPLETE' | 'INCOMPLETE';
  missingFields: string[];
}

export interface DriverOperationalStatusResult {
  driverProfileId: string;
  userId: string;
  displayName: string | null;
  profileCompletion: DriverProfileCompletionDetail;
  documentStatus: DriverDocumentStatus | 'NOT_SUBMITTED';
  adminApprovalStatus: DriverApprovalStatus;
  availabilityStatus: DriverAvailabilityStatus;
  dispatchEligibility: {
    isEligible: boolean;
    reasons: string[];
  };
  nextAction: DriverNextAction;
}

export interface DriverStatusForDriver extends DriverOperationalStatusResult {
  nextActionLabel: string;
}

export interface DriverStatusForAdmin extends DriverOperationalStatusResult {
  onboardingStatus: DriverOnboardingStatus;
  verificationStatus: DriverVerificationStatus;
  rejectionReason: string | null;
  changesRequestedReason: string | null;
  approvedAt: Date | null;
  approvedBy: string | null;
  documentsCount: number;
  verifiedDocumentsCount: number;
}

export interface DriverStatusForCustomer {
  driverProfileId: string;
  displayName: string;
  avatarUrl: string | null;
  isVerifiedDriver: boolean;
  verificationBadgeLabel: string;
  drivingExperienceYears: number;
  primaryServiceArea: string | null;
  availabilityStatus: DriverAvailabilityStatus;
}

/**
 * Authoritative operational status evaluator for a driver profile.
 * Combines profile completion, document state, admin approval, availability, and dispatch eligibility.
 */
export async function evaluateDriverOperationalStatus(
  driverProfileId: string,
  db: Db = prisma,
): Promise<DriverOperationalStatusResult> {
  const profile = await db.driverProfile.findUnique({
    where: { id: driverProfileId },
    include: {
      user: true,
      documents: { where: { isCurrent: true } },
    },
  });

  if (!profile) {
    throw new Error(`Driver profile not found: ${driverProfileId}`);
  }

  // 1. Evaluate Profile Completion
  const missingFields: string[] = [];
  if (!profile.firstName?.trim()) missingFields.push('firstName');
  if (!profile.lastName?.trim()) missingFields.push('lastName');
  if (!profile.dateOfBirth) missingFields.push('dateOfBirth');
  if (!profile.primaryServiceArea?.trim()) missingFields.push('primaryServiceArea');
  if (profile.drivingExperienceYears <= 0) missingFields.push('drivingExperienceYears');

  const profileCompletion: DriverProfileCompletionDetail = {
    status: missingFields.length === 0 ? 'COMPLETE' : 'INCOMPLETE',
    missingFields,
  };

  // 2. Evaluate Aggregate Document Status
  let documentStatus: DriverDocumentStatus | 'NOT_SUBMITTED' = 'NOT_SUBMITTED';
  if (profile.documents.length === 0) {
    documentStatus = 'NOT_SUBMITTED';
  } else {
    const hasRejected = profile.documents.some((d) => d.status === DriverDocumentStatus.REJECTED);
    const hasExpired = profile.documents.some((d) => d.status === DriverDocumentStatus.EXPIRED);
    const allVerified = profile.documents.every((d) => d.status === DriverDocumentStatus.VERIFIED);
    const hasUploaded = profile.documents.some(
      (d) =>
        d.status === DriverDocumentStatus.UPLOADED ||
        d.status === DriverDocumentStatus.PENDING_VERIFICATION,
    );

    if (hasRejected) {
      documentStatus = DriverDocumentStatus.REJECTED;
    } else if (hasExpired) {
      documentStatus = DriverDocumentStatus.EXPIRED;
    } else if (allVerified && profile.documents.length >= 2) {
      documentStatus = DriverDocumentStatus.VERIFIED;
    } else if (hasUploaded) {
      documentStatus = DriverDocumentStatus.PENDING_VERIFICATION;
    } else {
      documentStatus = DriverDocumentStatus.UPLOADED;
    }
  }

  // 3. Dispatch Eligibility
  const dispatchEligibility = await evaluateDriverEligibility(driverProfileId, db);

  // 4. Derive Next Action
  let nextAction: DriverNextAction = 'NONE';
  if (profileCompletion.status === 'INCOMPLETE') {
    nextAction = 'COMPLETE_PROFILE';
  } else if (documentStatus === 'NOT_SUBMITTED' || documentStatus === DriverDocumentStatus.REJECTED) {
    nextAction = 'UPLOAD_DOCUMENTS';
  } else if (
    profile.approvalStatus === DriverApprovalStatus.PENDING ||
    documentStatus === DriverDocumentStatus.PENDING_VERIFICATION
  ) {
    nextAction = 'WAIT_FOR_REVIEW';
  } else if (dispatchEligibility.isEligible && profile.availabilityStatus === DriverAvailabilityStatus.OFFLINE) {
    nextAction = 'GO_ONLINE';
  }

  return {
    driverProfileId: profile.id,
    userId: profile.userId,
    displayName: profile.displayName || `${profile.firstName ?? ''} ${profile.lastName ?? ''}`.trim() || 'Driver Partner',
    profileCompletion,
    documentStatus,
    adminApprovalStatus: profile.approvalStatus,
    availabilityStatus: profile.availabilityStatus,
    dispatchEligibility,
    nextAction,
  };
}

/**
 * Driver-facing DTO builder. Includes actionable next steps and human-readable labels.
 */
export async function getDriverStatusForDriver(
  driverProfileId: string,
  db: Db = prisma,
): Promise<DriverStatusForDriver> {
  const base = await evaluateDriverOperationalStatus(driverProfileId, db);
  let nextActionLabel = 'Complete Profile';

  switch (base.nextAction) {
    case 'COMPLETE_PROFILE':
      nextActionLabel = 'Complete Profile Details';
      break;
    case 'UPLOAD_DOCUMENTS':
      nextActionLabel = 'Upload Required Verification Documents';
      break;
    case 'WAIT_FOR_REVIEW':
      nextActionLabel = 'Verification Under Review';
      break;
    case 'GO_ONLINE':
      nextActionLabel = 'Go Online';
      break;
    default:
      nextActionLabel = 'Profile Complete';
      break;
  }

  return {
    ...base,
    nextActionLabel,
  };
}

/**
 * Admin-facing DTO builder. Exposes full operational metadata and audit info.
 */
export async function getDriverStatusForAdmin(
  driverProfileId: string,
  db: Db = prisma,
): Promise<DriverStatusForAdmin> {
  const base = await evaluateDriverOperationalStatus(driverProfileId, db);
  const profile = await db.driverProfile.findUnique({
    where: { id: driverProfileId },
    include: { documents: { where: { isCurrent: true } } },
  });

  if (!profile) {
    throw new Error(`Driver profile not found: ${driverProfileId}`);
  }

  const verifiedCount = profile.documents.filter((d) => d.status === DriverDocumentStatus.VERIFIED).length;

  return {
    ...base,
    onboardingStatus: profile.onboardingStatus,
    verificationStatus: profile.verificationStatus,
    rejectionReason: profile.rejectionReason,
    changesRequestedReason: profile.changesRequestedReason,
    approvedAt: profile.approvedAt,
    approvedBy: profile.approvedBy,
    documentsCount: profile.documents.length,
    verifiedDocumentsCount: verifiedCount,
  };
}

/**
 * Customer-facing DTO builder. Strictly sanitizes private compliance metadata, admin notes,
 * document URLs, and document numbers. Returns customer-safe badge information only.
 */
export async function getDriverStatusForCustomer(
  driverProfileId: string,
  db: Db = prisma,
): Promise<DriverStatusForCustomer> {
  const profile = await db.driverProfile.findUnique({
    where: { id: driverProfileId },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      displayName: true,
      profileImageUrl: true,
      drivingExperienceYears: true,
      primaryServiceArea: true,
      approvalStatus: true,
      verificationStatus: true,
      availabilityStatus: true,
    },
  });

  if (!profile) {
    throw new Error(`Driver profile not found: ${driverProfileId}`);
  }

  const isVerifiedDriver =
    profile.approvalStatus === DriverApprovalStatus.APPROVED &&
    profile.verificationStatus === DriverVerificationStatus.VERIFIED;

  return {
    driverProfileId: profile.id,
    displayName:
      profile.displayName ||
      `${profile.firstName ?? ''} ${profile.lastName ? profile.lastName[0] + '.' : ''}`.trim() ||
      'Professional Driver',
    avatarUrl: profile.profileImageUrl,
    isVerifiedDriver,
    verificationBadgeLabel: isVerifiedDriver ? 'Verified Driver' : 'Driver Verification In Progress',
    drivingExperienceYears: profile.drivingExperienceYears,
    primaryServiceArea: profile.primaryServiceArea,
    availabilityStatus: profile.availabilityStatus,
  };
}
