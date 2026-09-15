import { isDriverDispatchEligible } from '@/modules/driver/application/services/driver-eligibility-service';
import { driverScheduleService } from '@/modules/driver/application/services/driver-schedule-service';
import { prisma } from '@/shared/database/prisma';
import {
  AccountStatus,
  DriverApprovalStatus,
  DriverAvailabilityStatus,
  DriverDocumentStatus,
  DriverDocumentType,
  DriverOnboardingStatus,
  DriverVerificationStatus,
} from '@prisma/client';

jest.mock('@/shared/database/prisma', () => ({
  prisma: {
    driverProfile: {
      findUnique: jest.fn(),
    },
    booking: {
      findFirst: jest.fn(),
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

jest.mock('@/modules/driver/application/services/driver-schedule-service', () => ({
  driverScheduleService: {
    isDriverWithinSchedule: jest.fn(),
  },
}));

describe('Driver Dispatch Eligibility Unit Tests', () => {
  const validProfile = {
    id: 'prof-1',
    firstName: 'John',
    lastName: 'Doe',
    dateOfBirth: new Date('1990-01-01'),
    primaryServiceArea: 'North Zone',
    drivingExperienceYears: 5,
    onboardingStatus: DriverOnboardingStatus.COMPLETED,
    approvalStatus: DriverApprovalStatus.APPROVED,
    verificationStatus: DriverVerificationStatus.VERIFIED,
    availabilityStatus: DriverAvailabilityStatus.AVAILABLE,
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

  it('returns ineligible if driver profile does not exist', async () => {
    (prisma.driverProfile.findUnique as jest.Mock).mockResolvedValue(null);

    const result = await isDriverDispatchEligible('prof-missing');
    expect(result.isEligible).toBe(false);
    expect(result.reasons).toContain('Driver profile not found.');
  });

  it('returns ineligible if driver fails compliance check (e.g. suspended user)', async () => {
    (prisma.driverProfile.findUnique as jest.Mock).mockResolvedValue({
      ...validProfile,
      user: { accountStatus: AccountStatus.SUSPENDED },
    });

    const result = await isDriverDispatchEligible('prof-1');
    expect(result.isEligible).toBe(false);
    expect(result.reasons).toContain('User account is not active (status: SUSPENDED).');
  });

  it('returns ineligible if availability status is OFFLINE', async () => {
    (prisma.driverProfile.findUnique as jest.Mock).mockResolvedValue({
      ...validProfile,
      availabilityStatus: DriverAvailabilityStatus.OFFLINE,
    });
    (driverScheduleService.isDriverWithinSchedule as jest.Mock).mockResolvedValue(true);
    (prisma.booking.findFirst as jest.Mock).mockResolvedValue(null);

    const result = await isDriverDispatchEligible('prof-1');
    expect(result.isEligible).toBe(false);
    expect(result.reasons).toContain('Driver is currently OFFLINE.');
  });

  it('returns ineligible if availability status is BUSY', async () => {
    (prisma.driverProfile.findUnique as jest.Mock).mockResolvedValue({
      ...validProfile,
      availabilityStatus: DriverAvailabilityStatus.BUSY,
    });
    (driverScheduleService.isDriverWithinSchedule as jest.Mock).mockResolvedValue(true);
    (prisma.booking.findFirst as jest.Mock).mockResolvedValue(null);

    const result = await isDriverDispatchEligible('prof-1');
    expect(result.isEligible).toBe(false);
    expect(result.reasons).toContain(
      'Driver is currently BUSY handling another assignment or trip.',
    );
  });

  it('returns ineligible if driver is outside shift schedule', async () => {
    (prisma.driverProfile.findUnique as jest.Mock).mockResolvedValue(validProfile);
    (driverScheduleService.isDriverWithinSchedule as jest.Mock).mockResolvedValue(false);
    (prisma.booking.findFirst as jest.Mock).mockResolvedValue(null);

    const result = await isDriverDispatchEligible('prof-1');
    expect(result.isEligible).toBe(false);
    expect(result.reasons).toContain(
      'Current time is outside driver shift schedule or on a scheduled off day.',
    );
  });

  it('returns ineligible if driver has an active booking assignment', async () => {
    (prisma.driverProfile.findUnique as jest.Mock).mockResolvedValue(validProfile);
    (driverScheduleService.isDriverWithinSchedule as jest.Mock).mockResolvedValue(true);
    (prisma.booking.findFirst as jest.Mock).mockResolvedValue({ id: 'booking-123456789' });

    const result = await isDriverDispatchEligible('prof-1');
    expect(result.isEligible).toBe(false);
    expect(result.reasons[0]).toContain('Driver has an active booking in progress');
  });

  it('returns eligible when all dispatch criteria are met', async () => {
    (prisma.driverProfile.findUnique as jest.Mock).mockResolvedValue(validProfile);
    (driverScheduleService.isDriverWithinSchedule as jest.Mock).mockResolvedValue(true);
    (prisma.booking.findFirst as jest.Mock).mockResolvedValue(null);

    const result = await isDriverDispatchEligible('prof-1');
    expect(result.isEligible).toBe(true);
    expect(result.reasons).toHaveLength(0);
  });
});
