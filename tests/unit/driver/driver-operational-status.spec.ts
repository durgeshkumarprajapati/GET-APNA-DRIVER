import {
  evaluateDriverOperationalStatus,
  getDriverStatusForDriver,
  getDriverStatusForCustomer,
} from '@/modules/driver/application/services/driver-operational-status-service';
import {
  DriverApprovalStatus,
  DriverAvailabilityStatus,
  DriverDocumentStatus,
  DriverOnboardingStatus,
  DriverVerificationStatus,
} from '@prisma/client';

const mockProfile = {
  id: 'driver-prof-1',
  userId: 'user-driver-1',
  firstName: 'Rajesh',
  lastName: 'Kumar',
  displayName: 'Rajesh Kumar',
  profileImageUrl: 'https://example.com/photo.jpg',
  dateOfBirth: new Date('1990-01-01'),
  gender: 'MALE',
  drivingExperienceYears: 5,
  primaryServiceArea: 'Mumbai',
  onboardingStatus: DriverOnboardingStatus.COMPLETED,
  verificationStatus: DriverVerificationStatus.VERIFIED,
  approvalStatus: DriverApprovalStatus.APPROVED,
  availabilityStatus: DriverAvailabilityStatus.OFFLINE,
  rejectionReason: null,
  changesRequestedReason: null,
  approvedAt: new Date(),
  approvedBy: 'admin-1',
  documents: [
    {
      documentType: 'DRIVING_LICENSE',
      status: DriverDocumentStatus.VERIFIED,
      isCurrent: true,
      expiresAt: null,
    },
    {
      documentType: 'AADHAAR_CARD',
      status: DriverDocumentStatus.VERIFIED,
      isCurrent: true,
      expiresAt: null,
    },
  ],
};

const mockDb = {
  driverProfile: {
    findUnique: jest.fn(),
  },
} as any;

jest.mock('@/modules/driver/application/services/driver-eligibility-service', () => ({
  evaluateDriverEligibility: jest.fn().mockResolvedValue({
    isEligible: true,
    reasons: [],
  }),
}));

describe('Driver Operational Status Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('evaluates complete operational status for an approved driver', async () => {
    mockDb.driverProfile.findUnique.mockResolvedValue(mockProfile);

    const result = await evaluateDriverOperationalStatus('driver-prof-1', mockDb);

    expect(result.driverProfileId).toBe('driver-prof-1');
    expect(result.profileCompletion.status).toBe('COMPLETE');
    expect(result.documentStatus).toBe('VERIFIED');
    expect(result.adminApprovalStatus).toBe('APPROVED');
    expect(result.dispatchEligibility.isEligible).toBe(true);
    expect(result.nextAction).toBe('GO_ONLINE');
  });

  it('returns driver-facing DTO with actionable next steps', async () => {
    mockDb.driverProfile.findUnique.mockResolvedValue(mockProfile);

    const dto = await getDriverStatusForDriver('driver-prof-1', mockDb);

    expect(dto.nextActionLabel).toBe('Go Online');
    expect(dto.displayName).toBe('Rajesh Kumar');
  });

  it('sanitizes private compliance info for customer view', async () => {
    mockDb.driverProfile.findUnique.mockResolvedValue(mockProfile);

    const dto = await getDriverStatusForCustomer('driver-prof-1', mockDb);

    expect(dto.driverProfileId).toBe('driver-prof-1');
    expect(dto.isVerifiedDriver).toBe(true);
    expect(dto.verificationBadgeLabel).toBe('Verified Driver');
    expect((dto as any).documents).toBeUndefined();
    expect((dto as any).rejectionReason).toBeUndefined();
    expect((dto as any).approvedBy).toBeUndefined();
  });
});
