import {
  submitOnboarding,
  approveDriver,
  rejectDriver,
  suspendDriver,
} from '@/modules/driver/application/services/driver-onboarding-service';
import {
  DriverApprovalStatus,
  DriverOnboardingStatus,
  DriverVerificationStatus,
  DriverDocumentType,
  DriverDocumentStatus,
} from '@prisma/client';

const mockTx = {
  driverProfile: {
    findUnique: jest.fn(),
    update: jest.fn(),
  },
  driverDocument: {
    findMany: jest.fn(),
  },
  driverOnboardingLog: {
    create: jest.fn(),
  },
};

jest.mock('@/shared/database/prisma', () => ({
  prisma: {
    $transaction: jest.fn((cb: (tx: unknown) => unknown) => cb(mockTx)),
    driverProfile: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
  },
}));

jest.mock('@/shared/audit/audit-service', () => ({
  recordAuditLog: jest.fn(),
}));

jest.mock('@/shared/outbox/outbox-service', () => ({
  insertOutboxEvent: jest.fn(),
}));

jest.mock('@/shared/config/configuration-service', () => ({
  getJson: jest.fn().mockResolvedValue(['DRIVING_LICENSE', 'AADHAAR_CARD']),
}));

jest.mock('@/modules/driver/application/services/driver-eligibility-service', () => ({
  evaluateDriverEligibility: jest.fn(),
}));

import { evaluateDriverEligibility } from '@/modules/driver/application/services/driver-eligibility-service';

describe('DriverOnboardingService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('submitOnboarding', () => {
    it('submits driver onboarding if basic requirements are present', async () => {
      mockTx.driverProfile.findUnique.mockResolvedValue({
        id: 'dp-1',
        userId: 'user-1',
        firstName: 'John',
        lastName: 'Doe',
        dateOfBirth: new Date('1990-01-01'),
        primaryServiceArea: 'North Zone',
        drivingLicenseNumber: 'DL12345678',
        drivingExperienceYears: 4,
        onboardingStatus: DriverOnboardingStatus.IN_PROGRESS,
        documents: [
          { documentType: DriverDocumentType.DRIVING_LICENSE, isCurrent: true },
          { documentType: DriverDocumentType.AADHAAR_CARD, isCurrent: true },
        ],
      });

      mockTx.driverDocument.findMany.mockResolvedValue([
        { documentType: DriverDocumentType.DRIVING_LICENSE, isCurrent: true },
        { documentType: DriverDocumentType.AADHAAR_CARD, isCurrent: true },
      ]);

      mockTx.driverProfile.update.mockResolvedValue({
        id: 'dp-1',
        onboardingStatus: DriverOnboardingStatus.SUBMITTED,
        approvalStatus: DriverApprovalStatus.PENDING,
      });

      const res = await submitOnboarding('user-1');

      expect(res.onboardingStatus).toBe(DriverOnboardingStatus.SUBMITTED);
      expect(mockTx.driverProfile.update).toHaveBeenCalled();
      expect(mockTx.driverOnboardingLog.create).toHaveBeenCalled();
    });

    it('throws error if driving license number or experience is missing', async () => {
      mockTx.driverProfile.findUnique.mockResolvedValue({
        id: 'dp-1',
        userId: 'user-1',
        drivingLicenseNumber: '',
        drivingExperienceYears: 0,
        onboardingStatus: DriverOnboardingStatus.IN_PROGRESS,
        documents: [],
      });

      await expect(submitOnboarding('user-1')).rejects.toThrow(
        'Driver profile details must be completed before submission.',
      );
    });
  });

  describe('approveDriver', () => {
    it('approves driver application if driver is eligible', async () => {
      (evaluateDriverEligibility as jest.Mock).mockResolvedValue({
        isEligible: true,
        reasons: [],
      });

      mockTx.driverProfile.findUnique.mockResolvedValue({
        id: 'dp-1',
        userId: 'user-1',
        approvalStatus: DriverApprovalStatus.PENDING,
        onboardingStatus: DriverOnboardingStatus.SUBMITTED,
        verificationStatus: DriverVerificationStatus.VERIFIED,
        documents: [
          {
            documentType: DriverDocumentType.DRIVING_LICENSE,
            status: DriverDocumentStatus.VERIFIED,
          },
          { documentType: DriverDocumentType.AADHAAR_CARD, status: DriverDocumentStatus.VERIFIED },
        ],
      });

      mockTx.driverProfile.update.mockResolvedValue({
        id: 'dp-1',
        approvalStatus: DriverApprovalStatus.APPROVED,
        onboardingStatus: DriverOnboardingStatus.COMPLETED,
      });

      const res = await approveDriver('admin-1', 'dp-1');

      expect(res.approvalStatus).toBe(DriverApprovalStatus.APPROVED);
      expect(mockTx.driverProfile.update).toHaveBeenCalled();
    });

    it('throws DriverNotEligibleError if driver eligibility checks fail during approval', async () => {
      (evaluateDriverEligibility as jest.Mock).mockResolvedValue({
        isEligible: false,
        reasons: ['Required document AADHAAR_CARD is missing.'],
      });

      mockTx.driverProfile.findUnique.mockResolvedValue({
        id: 'dp-1',
        userId: 'user-1',
        approvalStatus: DriverApprovalStatus.PENDING,
        onboardingStatus: DriverOnboardingStatus.SUBMITTED,
        verificationStatus: DriverVerificationStatus.PENDING_VERIFICATION,
        documents: [],
      });

      await expect(approveDriver('admin-1', 'dp-1')).rejects.toThrow();
    });
  });

  describe('rejectDriver', () => {
    it('rejects driver application and updates status', async () => {
      mockTx.driverProfile.findUnique.mockResolvedValue({
        id: 'dp-1',
        userId: 'user-1',
        approvalStatus: DriverApprovalStatus.PENDING,
      });

      mockTx.driverProfile.update.mockResolvedValue({
        id: 'dp-1',
        approvalStatus: DriverApprovalStatus.REJECTED,
      });

      const res = await rejectDriver('admin-1', 'dp-1', 'Incomplete credentials');

      expect(res.approvalStatus).toBe(DriverApprovalStatus.REJECTED);
    });
  });

  describe('suspendDriver', () => {
    it('suspends driver and forces availability to OFFLINE', async () => {
      mockTx.driverProfile.findUnique.mockResolvedValue({
        id: 'dp-1',
        userId: 'user-1',
        approvalStatus: DriverApprovalStatus.APPROVED,
      });

      mockTx.driverProfile.update.mockResolvedValue({
        id: 'dp-1',
        approvalStatus: DriverApprovalStatus.SUSPENDED,
        availabilityStatus: 'OFFLINE',
      });

      const res = await suspendDriver('admin-1', 'dp-1', 'Policy violation');

      expect(res.approvalStatus).toBe(DriverApprovalStatus.SUSPENDED);
    });
  });
});
