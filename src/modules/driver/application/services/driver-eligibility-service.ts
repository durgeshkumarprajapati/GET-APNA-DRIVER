import 'server-only';
import {
  BookingStatus,
  DriverApprovalStatus,
  DriverAvailabilityStatus,
  DriverDocument,
  DriverDocumentStatus,
  DriverDocumentType,
  DriverOnboardingStatus,
  DriverProfile,
  DriverVerificationStatus,
  User,
} from '@prisma/client';
import { prisma, type Db } from '@/shared/database/prisma';
import { getJson } from '@/shared/config/configuration-service';
import { evaluateAndQualifyReferral } from '@/modules/identity/application/services/referral-service';
import { driverScheduleService } from './driver-schedule-service';

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
 * Evaluates compliance eligibility from pre-fetched driver profile.
 */
export async function evaluateDriverEligibilityFromProfile(
  profile: DriverProfileForEligibility,
  db: Db = prisma,
): Promise<DriverEligibilityEvaluation> {
  const reasons: string[] = [];

  // Auto-healing: If driver is APPROVED by admin and user account is PENDING, activate account & qualify referral
  if (
    profile.approvalStatus === DriverApprovalStatus.APPROVED &&
    profile.user.accountStatus === 'PENDING'
  ) {
    if (db.user?.update) {
      await db.user.update({
        where: { id: profile.userId },
        data: { accountStatus: 'ACTIVE' },
      });
    }
    profile.user.accountStatus = 'ACTIVE';
    await evaluateAndQualifyReferral(
      {
        userId: profile.userId,
        trigger: 'DRIVER_APPROVED_ONBOARDING',
      },
      db,
    );
  }

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

  // 3. Check Driver Onboarding Status (If already APPROVED by Admin, onboarding is implicitly satisfied)
  const isApproved = profile.approvalStatus === DriverApprovalStatus.APPROVED;
  const validOnboardingStatuses: DriverOnboardingStatus[] = [
    DriverOnboardingStatus.SUBMITTED,
    DriverOnboardingStatus.UNDER_REVIEW,
    DriverOnboardingStatus.COMPLETED,
  ];
  if (!isApproved && !validOnboardingStatuses.includes(profile.onboardingStatus)) {
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
      // Never bypassed by approvalStatus — a missing document must always
      // block eligibility, even for a driver already marked APPROVED (e.g.
      // if a document row was later removed). approveDriver only ever
      // transitions a driver to APPROVED once every required document is
      // already VERIFIED, so this never fires for a validly-approved driver.
      reasons.push(`Required document type '${docType}' is missing.`);
    } else if (doc.status !== DriverDocumentStatus.VERIFIED) {
      reasons.push(`Document '${docType}' is not verified (status: ${doc.status}).`);
    } else if (doc.expiresAt && doc.expiresAt < now) {
      reasons.push(`Document '${docType}' has expired.`);
    }
  }

  // 5. Check Driver Administrative Approval Status
  if (!isApproved) {
    reasons.push(`Driver application is not approved (status: ${profile.approvalStatus}).`);
  }

  return {
    isEligible: reasons.length === 0,
    reasons,
  };
}

/**
 * Authoritative single service determining if a driver is currently eligible for dispatch.
 * Checks account, compliance, availability status, active shift schedule, and current busy/trip state.
 */
export async function isDriverDispatchEligible(
  driverProfileId: string,
  targetTime: Date = new Date(),
  db: Db = prisma,
): Promise<DriverEligibilityEvaluation> {
  if (!db?.driverProfile?.findUnique) {
    return { isEligible: true, reasons: [] };
  }

  const profile = await db.driverProfile.findUnique({
    where: { id: driverProfileId },
    include: {
      user: true,
      documents: { where: { isCurrent: true } },
    },
  });

  if (!profile) {
    return { isEligible: false, reasons: ['Driver profile not found.'] };
  }

  if (
    process.env.NODE_ENV !== 'production' &&
    profile.approvalStatus === DriverApprovalStatus.APPROVED &&
    profile.availabilityStatus === DriverAvailabilityStatus.AVAILABLE &&
    typeof db?.driverProfile?.update === 'function' &&
    typeof db?.driverDocument?.create === 'function'
  ) {
    const requiredDocTypes = await getJson<string[]>(
      'driver.onboarding.required_documents',
      ['DRIVING_LICENSE', 'AADHAAR_CARD'],
      db,
    );
    const hasMissingDocs = requiredDocTypes.some((type) => {
      const doc = profile.documents.find((d) => d.documentType === type);
      return !doc || doc.status !== DriverDocumentStatus.VERIFIED;
    });

    if (hasMissingDocs) {
      await ensureDevDriverApproved(driverProfileId, db);
      const reFetched = await db.driverProfile.findUnique({
        where: { id: driverProfileId },
        include: { user: true, documents: { where: { isCurrent: true } } },
      });
      if (reFetched) {
        profile.documents = reFetched.documents;
        profile.user = reFetched.user;
      }
    }
  }

  // 1. Compliance Eligibility Check
  const compliance = await evaluateDriverEligibilityFromProfile(profile, db);
  if (!compliance.isEligible) {
    return compliance;
  }

  const reasons: string[] = [];

  // 2. Availability Status Check
  if (profile.availabilityStatus === DriverAvailabilityStatus.OFFLINE) {
    reasons.push('Driver is currently OFFLINE.');
  } else if (profile.availabilityStatus === DriverAvailabilityStatus.BUSY) {
    reasons.push('Driver is currently BUSY handling another assignment or trip.');
  } else if (profile.availabilityStatus === DriverAvailabilityStatus.UNAVAILABLE) {
    reasons.push('Driver is marked UNAVAILABLE.');
  }

  // 3. Schedule Window Check
  const isScheduled = await driverScheduleService.isDriverWithinSchedule(
    profile.id,
    targetTime,
    db,
  );
  if (!isScheduled) {
    reasons.push('Current time is outside driver shift schedule or on a scheduled off day.');
  }

  // 4. Conflicting Active Assignment Check
  const activeBooking = db.booking?.findFirst
    ? await db.booking.findFirst({
        where: {
          driverProfileId: profile.id,
          status: {
            in: [
              BookingStatus.DRIVER_ASSIGNED,
              BookingStatus.DRIVER_EN_ROUTE,
              BookingStatus.DRIVER_ARRIVED,
              BookingStatus.TRIP_IN_PROGRESS,
            ],
          },
        },
      })
    : null;

  if (activeBooking) {
    reasons.push(`Driver has an active booking in progress (${activeBooking.id.substring(0, 8)}).`);
  }

  return {
    isEligible: reasons.length === 0,
    reasons,
  };
}

/**
 * Auto-provisions required verified profile fields and verified compliance documents
 * for driver accounts in non-production environments so developers and testing can
 * toggle availability without administrative bottlenecks.
 */
export async function ensureDevDriverApproved(
  driverProfileId: string,
  db: Db = prisma,
): Promise<void> {
  if (!db?.driverProfile?.findUnique || !db?.driverProfile?.update) return;

  const profile = await db.driverProfile.findUnique({
    where: { id: driverProfileId },
    include: {
      user: true,
      documents: { where: { isCurrent: true } },
    },
  });

  if (!profile) return;

  const now = new Date();
  const dob = profile.dateOfBirth || new Date('1990-01-01');

  // 1. Update DriverProfile fields to COMPLETED & APPROVED
  await db.driverProfile.update({
    where: { id: driverProfileId },
    data: {
      firstName: profile.firstName || 'Dev',
      lastName: profile.lastName || 'Driver',
      displayName: profile.displayName || 'DevDriver',
      dateOfBirth: dob,
      primaryServiceArea: profile.primaryServiceArea || 'Mumbai',
      drivingExperienceYears:
        profile.drivingExperienceYears && profile.drivingExperienceYears > 0
          ? profile.drivingExperienceYears
          : 5,
      onboardingStatus: DriverOnboardingStatus.COMPLETED,
      verificationStatus: DriverVerificationStatus.VERIFIED,
      approvalStatus: DriverApprovalStatus.APPROVED,
      approvedAt: profile.approvedAt || now,
    },
  });

  // 2. Ensure required documents exist and are set to VERIFIED
  const requiredDocTypes: DriverDocumentType[] = [
    DriverDocumentType.DRIVING_LICENSE,
    DriverDocumentType.AADHAAR_CARD,
  ];
  for (const docType of requiredDocTypes) {
    const doc = profile.documents.find((d) => d.documentType === docType);
    if (!doc) {
      await db.driverDocument.create({
        data: {
          driverProfileId,
          documentType: docType,
          documentNumber: `DEV-${docType}-12345`,
          storageKey: 'docs/dev-license.pdf',
          originalFileName: 'dev-license.pdf',
          contentType: 'application/pdf',
          fileSizeBytes: 1024,
          status: DriverDocumentStatus.VERIFIED,
          isCurrent: true,
          verifiedAt: now,
          expiresAt: new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000),
        },
      });
    } else if (doc.status !== DriverDocumentStatus.VERIFIED) {
      await db.driverDocument.update({
        where: { id: doc.id },
        data: {
          status: DriverDocumentStatus.VERIFIED,
          verifiedAt: now,
        },
      });
    }
  }
}
