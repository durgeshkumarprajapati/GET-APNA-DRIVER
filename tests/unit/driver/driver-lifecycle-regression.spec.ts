import {
  evaluateDriverOperationalStatus,
  getDriverStatusForDriver,
  getDriverStatusForAdmin,
  getDriverStatusForCustomer,
} from '@/modules/driver/application/services/driver-operational-status-service';
import { approveDriver } from '@/modules/driver/application/services/driver-onboarding-service';
import {
  DriverApprovalStatus,
  DriverDocumentStatus,
  DriverOnboardingStatus,
  DriverVerificationStatus,
} from '@prisma/client';
import type { Db } from '@/shared/database/prisma';

describe('Phase 57 Driver Lifecycle & Integrity — Regression Test Suite', () => {
  const mockUnverifiedProfile = {
    id: 'driver-prof-new',
    userId: 'user-driver-new',
    firstName: 'New',
    lastName: 'Driver',
    displayName: 'New Driver',
    dateOfBirth: new Date('1992-05-10'),
    primaryServiceArea: 'Delhi NCR',
    drivingExperienceYears: 4,
    drivingLicenseNumber: 'DL-998877',
    onboardingStatus: DriverOnboardingStatus.SUBMITTED,
    verificationStatus: DriverVerificationStatus.NOT_VERIFIED,
    approvalStatus: DriverApprovalStatus.PENDING,
    availabilityStatus: 'OFFLINE',
    rejectionReason: null,
    changesRequestedReason: null,
    approvedAt: null,
    approvedBy: null,
    user: {
      id: 'user-driver-new',
      email: 'newdriver@getapnadriver.local',
      accountStatus: 'PENDING',
    },
    documents: [],
  };

  const mockApprovedProfile = {
    ...mockUnverifiedProfile,
    id: 'driver-prof-approved',
    onboardingStatus: DriverOnboardingStatus.COMPLETED,
    verificationStatus: DriverVerificationStatus.VERIFIED,
    approvalStatus: DriverApprovalStatus.APPROVED,
    approvedAt: new Date(),
    approvedBy: 'admin-user-1',
    user: {
      id: 'user-driver-approved',
      email: 'approveddriver@getapnadriver.local',
      accountStatus: 'ACTIVE',
    },
    documents: [
      {
        id: 'doc-dl',
        documentType: 'DRIVING_LICENSE',
        status: DriverDocumentStatus.VERIFIED,
        isCurrent: true,
        expiresAt: new Date(Date.now() + 864000000),
      },
      {
        id: 'doc-aadhaar',
        documentType: 'AADHAAR_CARD',
        status: DriverDocumentStatus.VERIFIED,
        isCurrent: true,
        expiresAt: null,
      },
    ],
  };

  it('1. Newly registered driver defaults to UNVERIFIED and PENDING without fabricated documents', async () => {
    expect(mockUnverifiedProfile.verificationStatus).not.toBe(DriverVerificationStatus.VERIFIED);
    expect(mockUnverifiedProfile.approvalStatus).not.toBe(DriverApprovalStatus.APPROVED);
    expect(mockUnverifiedProfile.documents.length).toBe(0);
  });

  it('2. Missing documents result in nextAction = UPLOAD_DOCUMENTS and INCOMPLETE status', async () => {
    const mockDb = {
      driverProfile: {
        findUnique: jest.fn().mockResolvedValue(mockUnverifiedProfile),
      },
    } as unknown as Db;

    const status = await evaluateDriverOperationalStatus('driver-prof-new', mockDb);
    expect(status.documentStatus).toBe('NOT_SUBMITTED');
    expect(status.adminApprovalStatus).toBe(DriverApprovalStatus.PENDING);
    expect(status.nextAction).toBe('UPLOAD_DOCUMENTS');
  });

  it('3. Driver approval fails if required documents are unverified or missing', async () => {
    const mockDb = {
      $transaction: jest.fn(async (cb) => cb(mockDb)),
      driverProfile: {
        findUnique: jest.fn().mockResolvedValue(mockUnverifiedProfile),
      },
      configurationSetting: {
        findUnique: jest.fn().mockResolvedValue(null),
      },
    } as unknown as Db;

    await expect(approveDriver('admin-1', 'driver-prof-new', null, mockDb)).rejects.toThrow(
      /Document/i,
    );
  });

  it('4. Role-safe status projections isolate internal compliance from Customer view', async () => {
    const mockDb = {
      driverProfile: {
        findUnique: jest.fn().mockResolvedValue(mockApprovedProfile),
      },
    } as unknown as Db;

    const customerDto = await getDriverStatusForCustomer('driver-prof-approved', mockDb);
    expect(customerDto.isVerifiedDriver).toBe(true);
    expect(customerDto.verificationBadgeLabel).toBe('Verified Driver');
    expect(customerDto).not.toHaveProperty('documents');
    expect(customerDto).not.toHaveProperty('rejectionReason');
    expect(customerDto).not.toHaveProperty('approvedBy');

    const driverDto = await getDriverStatusForDriver('driver-prof-approved', mockDb);
    expect(driverDto.nextActionLabel).toBeDefined();

    const adminDto = await getDriverStatusForAdmin('driver-prof-approved', mockDb);
    expect(adminDto.onboardingStatus).toBe(DriverOnboardingStatus.COMPLETED);
    expect(adminDto.documentsCount).toBe(2);
    expect(adminDto.verifiedDocumentsCount).toBe(2);
  });
});
