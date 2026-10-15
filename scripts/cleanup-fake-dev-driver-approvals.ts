/**
 * One-off remediation for a fixed bug: `ensureDevDriverApproved` (removed)
 * used to silently fabricate onboarding/verification/approval data for any
 * driver profile, in any non-production environment, the first time their
 * availability was checked (which happens on every /driver/* page load).
 * It:
 *   1. Set DriverProfile.onboardingStatus/verificationStatus/approvalStatus
 *      to COMPLETED/VERIFIED/APPROVED, with approvedBy left null (a real
 *      admin approval always sets approvedBy — see
 *      driver-onboarding-service.ts).
 *   2. Filled blank firstName/lastName/displayName/primaryServiceArea/
 *      drivingExperienceYears with placeholder values ('Dev', 'Driver',
 *      'DevDriver', 'Mumbai', 5) — but only ever as a fallback for an
 *      empty field, never overwriting a real value.
 *   3. Either created a brand-new DriverDocument row with a fake
 *      documentNumber ('DEV-<type>-12345'), storageKey
 *      ('docs/dev-license.pdf') and originalFileName ('dev-license.pdf'),
 *      or, if a real (driver-uploaded) document already existed, forced its
 *      status to VERIFIED — in both cases leaving verifiedBy null (a real
 *      admin verification always sets verifiedBy — see
 *      driver-document-service.ts).
 *
 * This script finds and reverses exactly that signature, and nothing else:
 * every condition below requires `approvedBy`/`verifiedBy` to be null,
 * which a genuine admin action always sets — so a profile or document a
 * human actually reviewed is never touched, however it looks otherwise.
 *
 * Defaults to a dry run (reports what it would change). Pass --confirm to
 * actually apply the fix.
 *
 * Usage:
 *   npx tsx scripts/cleanup-fake-dev-driver-approvals.ts
 *   npx tsx scripts/cleanup-fake-dev-driver-approvals.ts --confirm
 */
import 'dotenv/config';
import { PrismaClient, DriverApprovalStatus, DriverDocumentStatus } from '@prisma/client';

const prisma = new PrismaClient();

const FAKE_DOC_NUMBER_PREFIX = 'DEV-';
const FAKE_STORAGE_KEY = 'docs/dev-license.pdf';
const FAKE_ORIGINAL_FILENAME = 'dev-license.pdf';

const FAKE_PLACEHOLDER_PROFILE = {
  firstName: 'Dev',
  lastName: 'Driver',
  displayName: 'DevDriver',
  primaryServiceArea: 'Mumbai',
  drivingExperienceYears: 5,
} as const;

async function main(): Promise<void> {
  const confirm = process.argv.includes('--confirm');
  console.log(
    confirm
      ? 'Running in APPLY mode (--confirm passed).'
      : 'Running in DRY-RUN mode (pass --confirm to apply).',
  );
  console.log('');

  // --- 1. Entirely-fabricated document rows: delete them outright, since
  // no real file was ever uploaded to that storageKey. ---
  const fabricatedDocs = await prisma.driverDocument.findMany({
    where: {
      documentNumber: { startsWith: FAKE_DOC_NUMBER_PREFIX },
      storageKey: FAKE_STORAGE_KEY,
      originalFileName: FAKE_ORIGINAL_FILENAME,
      verifiedBy: null,
    },
    select: { id: true, driverProfileId: true, documentType: true },
  });
  console.log(`Fabricated document rows to delete: ${fabricatedDocs.length}`);
  for (const doc of fabricatedDocs) {
    console.log(`  - ${doc.id} (${doc.documentType}, driverProfileId=${doc.driverProfileId})`);
  }

  // --- 2. Real driver-uploaded documents whose status was force-flipped to
  // VERIFIED by the bug: roll back to PENDING_VERIFICATION (awaiting real
  // review) rather than deleting — the uploaded file itself is real. ---
  const forceVerifiedDocs = await prisma.driverDocument.findMany({
    where: {
      status: DriverDocumentStatus.VERIFIED,
      verifiedBy: null,
      NOT: {
        documentNumber: { startsWith: FAKE_DOC_NUMBER_PREFIX },
        storageKey: FAKE_STORAGE_KEY,
        originalFileName: FAKE_ORIGINAL_FILENAME,
      },
    },
    select: { id: true, driverProfileId: true, documentType: true, originalFileName: true },
  });
  console.log(
    `\nReal documents force-verified by the bug (status -> PENDING_VERIFICATION): ${forceVerifiedDocs.length}`,
  );
  for (const doc of forceVerifiedDocs) {
    console.log(
      `  - ${doc.id} (${doc.documentType}, "${doc.originalFileName}", driverProfileId=${doc.driverProfileId})`,
    );
  }

  // --- 3. Driver profiles fabricated-approved: reset status fields, and
  // only the exact placeholder values the bug writes (never a real value
  // it would have left alone). ---
  const fabricatedProfiles = await prisma.driverProfile.findMany({
    where: { approvalStatus: DriverApprovalStatus.APPROVED, approvedBy: null },
    select: {
      id: true,
      userId: true,
      firstName: true,
      lastName: true,
      displayName: true,
      primaryServiceArea: true,
      drivingExperienceYears: true,
      onboardingStatus: true,
      verificationStatus: true,
    },
  });
  console.log(`\nFabricated-approved driver profiles to reset: ${fabricatedProfiles.length}`);
  for (const p of fabricatedProfiles) {
    const placeholderFields =
      p.firstName === FAKE_PLACEHOLDER_PROFILE.firstName &&
      p.lastName === FAKE_PLACEHOLDER_PROFILE.lastName &&
      p.displayName === FAKE_PLACEHOLDER_PROFILE.displayName &&
      p.primaryServiceArea === FAKE_PLACEHOLDER_PROFILE.primaryServiceArea &&
      p.drivingExperienceYears === FAKE_PLACEHOLDER_PROFILE.drivingExperienceYears;
    console.log(
      `  - driverProfileId=${p.id} userId=${p.userId} onboardingStatus=${p.onboardingStatus} verificationStatus=${p.verificationStatus}` +
        (placeholderFields ? ' [also clearing placeholder name/area/experience]' : ''),
    );
  }

  if (!confirm) {
    console.log('\nDry run only — no changes made. Re-run with --confirm to apply.');
    await prisma.$disconnect();
    return;
  }

  console.log('\nApplying changes...');

  if (fabricatedDocs.length > 0) {
    await prisma.driverDocument.deleteMany({
      where: { id: { in: fabricatedDocs.map((d) => d.id) } },
    });
  }

  for (const doc of forceVerifiedDocs) {
    await prisma.driverDocument.update({
      where: { id: doc.id },
      data: { status: DriverDocumentStatus.PENDING_VERIFICATION, verifiedAt: null },
    });
  }

  for (const p of fabricatedProfiles) {
    const placeholderFields =
      p.firstName === FAKE_PLACEHOLDER_PROFILE.firstName &&
      p.lastName === FAKE_PLACEHOLDER_PROFILE.lastName &&
      p.displayName === FAKE_PLACEHOLDER_PROFILE.displayName &&
      p.primaryServiceArea === FAKE_PLACEHOLDER_PROFILE.primaryServiceArea &&
      p.drivingExperienceYears === FAKE_PLACEHOLDER_PROFILE.drivingExperienceYears;

    await prisma.driverProfile.update({
      where: { id: p.id },
      data: {
        onboardingStatus: 'NOT_STARTED',
        verificationStatus: 'NOT_VERIFIED',
        approvalStatus: 'PENDING',
        approvedAt: null,
        ...(placeholderFields
          ? {
              firstName: null,
              lastName: null,
              displayName: null,
              primaryServiceArea: null,
              drivingExperienceYears: 0,
            }
          : {}),
      },
    });
  }

  console.log('Done.');
  await prisma.$disconnect();
}

main().catch(async (err) => {
  console.error(err);
  await prisma.$disconnect();
  process.exit(1);
});
