import 'server-only';
import {
  DriverApprovalStatus,
  DriverDocument,
  DriverDocumentStatus,
  DriverOnboardingStatus,
  DriverProfile,
  User,
} from '@prisma/client';
import { prisma, type Db } from '@/shared/database/prisma';
import { getJson } from '@/shared/config/configuration-service';

export interface DriverEligibilityEvaluation {
  isEligible: boolean;
  reasons: string[];
}

export type DriverProfileForEligibility = DriverProfile & {
  user: User;
  documents: DriverDocument[];
};

/**
 * Server-authoritative evaluator determining if a driver meets all criteria to go AVAILABLE.
 */
export async function evaluateDriverEligibility(
  driverProfileId: string,
  db: Db = prisma,
): Promise<DriverEligibilityEvaluation> {
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
    return {
      isEligible: false,
      reasons: ['Driver profile not found.'],
    };
  }

  return evaluateDriverEligibilityFromProfile(profile, db);
}

/**
 * Same evaluation, given an already-fetched profile (with `user` and
 * current `documents` included) — lets a caller that already needs the
 * full profile for another purpose (e.g. nearby-driver-service.ts, which
 * also assembles a public portfolio from the same row) avoid fetching it
 * twice.
 */
export async function evaluateDriverEligibilityFromProfile(
  profile: DriverProfileForEligibility,
  db: Db = prisma,
): Promise<DriverEligibilityEvaluation> {
  const reasons: string[] = [];

  // 1. Check User Account Status
  if (profile.user.accountStatus !== 'ACTIVE') {
    reasons.push(`User account is not active (status: ${profile.user.accountStatus}).`);
  }

  // 2. Check Driver Profile Completeness
  if (
    !profile.firstName ||
    !profile.lastName ||
    !profile.dateOfBirth ||
    !profile.primaryServiceArea ||
    profile.drivingExperienceYears <= 0
  ) {
    reasons.push('Driver profile details are incomplete.');
  }

  // 3. Check Driver Onboarding Status
  const validOnboardingStatuses: DriverOnboardingStatus[] = [
    DriverOnboardingStatus.SUBMITTED,
    DriverOnboardingStatus.UNDER_REVIEW,
    DriverOnboardingStatus.COMPLETED,
  ];
  if (!validOnboardingStatuses.includes(profile.onboardingStatus)) {
    reasons.push(
      `Driver onboarding has not been submitted or completed (status: ${profile.onboardingStatus}).`,
    );
  }

  // 4. Check Required Documents & Verification
  const requiredDocTypes = await getJson<string[]>(
    'driver.onboarding.required_documents',
    ['DRIVING_LICENSE', 'AADHAAR_CARD'],
    db,
  );

  const now = new Date();

  for (const docType of requiredDocTypes) {
    const doc = profile.documents.find((d) => d.documentType === docType);
    if (!doc) {
      reasons.push(`Required document type '${docType}' is missing.`);
    } else if (doc.status !== DriverDocumentStatus.VERIFIED) {
      reasons.push(`Document '${docType}' is not verified (status: ${doc.status}).`);
    } else if (doc.expiresAt && doc.expiresAt < now) {
      reasons.push(`Document '${docType}' has expired.`);
    }
  }

  // 5. Check Driver Administrative Approval Status
  if (profile.approvalStatus !== DriverApprovalStatus.APPROVED) {
    reasons.push(`Driver application is not approved (status: ${profile.approvalStatus}).`);
  }

  return {
    isEligible: reasons.length === 0,
    reasons,
  };
}
