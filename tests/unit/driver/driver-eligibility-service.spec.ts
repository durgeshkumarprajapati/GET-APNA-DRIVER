import { evaluateDriverEligibility } from '@/modules/driver/application/services/driver-eligibility-service';
import {
  AccountStatus,
  DriverApprovalStatus,
  DriverVerificationStatus,
  DriverDocumentType,
  DriverDocumentStatus,
  DriverOnboardingStatus,
} from '@prisma/client';

jest.mock('@/shared/database/prisma', () => ({
  prisma: {
    driverProfile: {
      findUnique: jest.fn(),
    },
  },
}));

jest.mock('@/shared/config/configuration-service', () => ({
  getJson: jest.fn().mockImplementation((key: string, defaultValue: string[]) => {
    if (key === 'driver.onboarding.required_documents') {
      return Promise.resolve(['DRIVING_LICENSE', 'AADHAAR_CARD']);
    }
    return Promise.resolve(defaultValue);
  }),
}));

import { prisma } from '@/shared/database/prisma';

describe('DriverEligibilityService', () => {
  const mockFindUnique = prisma.driverProfile.findUnique as jest.Mock;

  const validBaseProfile = {
    id: 'driver-1',
    firstName: 'John',
    lastName: 'Doe',
    dateOfBirth: new Date('1990-01-01'),
    primaryServiceArea: 'North Zone',
    drivingExperienceYears: 5,
    onboardingStatus: DriverOnboardingStatus.COMPLETED,
    approvalStatus: DriverApprovalStatus.APPROVED,
    verificationStatus: DriverVerificationStatus.VERIFIED,
    user: {
      accountStatus: AccountStatus.ACTIVE,
    },
    documents: [
      {
        documentType: DriverDocumentType.DRIVING_LICENSE,
        status: DriverDocumentStatus.VERIFIED,
        isCurrent: true,
        expiresAt: null,
      },
      {
        documentType: DriverDocumentType.AADHAAR_CARD,
        status: DriverDocumentStatus.VERIFIED,
        isCurrent: true,
        expiresAt: null,
      },
    ],
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns false with reasons when driver profile does not exist', async () => {
    mockFindUnique.mockResolvedValue(null);

    const result = await evaluateDriverEligibility('driver-1');

    expect(result.isEligible).toBe(false);
    expect(result.reasons).toContain('Driver profile not found.');
  });

  it('returns false when user account is not ACTIVE', async () => {
    mockFindUnique.mockResolvedValue({
      ...validBaseProfile,
      user: { accountStatus: AccountStatus.SUSPENDED },
    });

    const result = await evaluateDriverEligibility('driver-1');

    expect(result.isEligible).toBe(false);
    expect(result.reasons).toContain('User account is not active (status: SUSPENDED).');
  });

  it('returns false when approval status is not APPROVED', async () => {
    mockFindUnique.mockResolvedValue({
      ...validBaseProfile,
      approvalStatus: DriverApprovalStatus.PENDING,
    });

    const result = await evaluateDriverEligibility('driver-1');

    expect(result.isEligible).toBe(false);
    expect(result.reasons).toContain('Driver application is not approved (status: PENDING).');
  });

  it('returns false when a required document is missing or not VERIFIED', async () => {
    mockFindUnique.mockResolvedValue({
      ...validBaseProfile,
      verificationStatus: DriverVerificationStatus.PENDING_VERIFICATION,
      documents: [
        {
          documentType: DriverDocumentType.DRIVING_LICENSE,
          status: DriverDocumentStatus.VERIFIED,
          isCurrent: true,
          expiresAt: null,
        },
        {
          documentType: DriverDocumentType.AADHAAR_CARD,
          status: DriverDocumentStatus.UPLOADED,
          isCurrent: true,
          expiresAt: null,
        },
      ],
    });

    const result = await evaluateDriverEligibility('driver-1');

    expect(result.isEligible).toBe(false);
    expect(result.reasons).toContain("Document 'AADHAAR_CARD' is not verified (status: UPLOADED).");
  });

  it('returns true when all eligibility criteria are met', async () => {
    mockFindUnique.mockResolvedValue(validBaseProfile);

    const result = await evaluateDriverEligibility('driver-1');

    expect(result.isEligible).toBe(true);
    expect(result.reasons).toHaveLength(0);
  });
});
