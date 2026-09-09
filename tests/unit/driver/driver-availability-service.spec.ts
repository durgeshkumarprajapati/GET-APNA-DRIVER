import {
  getDriverAvailability,
  setDriverAvailability,
} from '@/modules/driver/application/services/driver-availability-service';
import { DriverAvailabilityStatus } from '@prisma/client';
import { DriverNotEligibleError } from '@/modules/driver/domain/errors';

const mockTx = {
  driverProfile: {
    findUnique: jest.fn(),
    update: jest.fn(),
  },
  driverCurrentLocation: {
    findUnique: jest.fn(),
  },
};

jest.mock('@/shared/database/prisma', () => ({
  prisma: {
    $transaction: jest.fn((cb: (tx: unknown) => unknown) => cb(mockTx)),
    driverProfile: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    driverCurrentLocation: {
      findUnique: jest.fn(),
    },
  },
}));

jest.mock('@/shared/audit/audit-service', () => ({
  recordAuditLog: jest.fn(),
}));

jest.mock('@/shared/outbox/outbox-service', () => ({
  insertOutboxEvent: jest.fn(),
}));

jest.mock('@/modules/driver/application/services/driver-profile-service', () => ({
  getOrCreateDriverProfile: jest.fn().mockResolvedValue({
    id: 'dp-1',
    userId: 'user-1',
    availabilityStatus: 'OFFLINE',
    onboardingStatus: 'COMPLETED',
    verificationStatus: 'VERIFIED',
    approvalStatus: 'APPROVED',
  }),
}));

jest.mock('@/modules/driver/application/services/driver-eligibility-service', () => ({
  evaluateDriverEligibility: jest.fn(),
}));

import { evaluateDriverEligibility } from '@/modules/driver/application/services/driver-eligibility-service';

describe('DriverAvailabilityService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getDriverAvailability', () => {
    it('returns availability status and eligibility details', async () => {
      (evaluateDriverEligibility as jest.Mock).mockResolvedValue({
        isEligible: true,
        reasons: [],
      });

      const res = await getDriverAvailability('user-1');

      expect(res.availabilityStatus).toBe(DriverAvailabilityStatus.OFFLINE);
      expect(res.isEligible).toBe(true);
    });
  });

  describe('setDriverAvailability', () => {
    it('allows driver to set status to AVAILABLE when eligible', async () => {
      (evaluateDriverEligibility as jest.Mock).mockResolvedValue({
        isEligible: true,
        reasons: [],
      });

      mockTx.driverProfile.findUnique.mockResolvedValue({
        id: 'dp-1',
        userId: 'user-1',
        availabilityStatus: DriverAvailabilityStatus.OFFLINE,
      });

      mockTx.driverProfile.update.mockResolvedValue({
        id: 'dp-1',
        availabilityStatus: DriverAvailabilityStatus.AVAILABLE,
      });

      const updated = await setDriverAvailability('user-1', DriverAvailabilityStatus.AVAILABLE);

      expect(updated.availabilityStatus).toBe(DriverAvailabilityStatus.AVAILABLE);
      expect(mockTx.driverProfile.update).toHaveBeenCalledWith({
        where: { id: 'dp-1' },
        data: { availabilityStatus: DriverAvailabilityStatus.AVAILABLE },
      });
    });

    it('throws DriverNotEligibleError when setting AVAILABLE if not eligible', async () => {
      (evaluateDriverEligibility as jest.Mock).mockResolvedValue({
        isEligible: false,
        reasons: ['User account status is SUSPENDED.'],
      });

      mockTx.driverProfile.findUnique.mockResolvedValue({
        id: 'dp-1',
        userId: 'user-1',
        availabilityStatus: DriverAvailabilityStatus.OFFLINE,
      });

      await expect(
        setDriverAvailability('user-1', DriverAvailabilityStatus.AVAILABLE),
      ).rejects.toThrow(DriverNotEligibleError);
    });

    it('always allows driver to set status to OFFLINE even if not eligible', async () => {
      (evaluateDriverEligibility as jest.Mock).mockResolvedValue({
        isEligible: false,
        reasons: ['Driver approval pending.'],
      });

      mockTx.driverProfile.findUnique.mockResolvedValue({
        id: 'dp-1',
        userId: 'user-1',
        availabilityStatus: DriverAvailabilityStatus.AVAILABLE,
      });

      mockTx.driverProfile.update.mockResolvedValue({
        id: 'dp-1',
        availabilityStatus: DriverAvailabilityStatus.OFFLINE,
      });

      const updated = await setDriverAvailability('user-1', DriverAvailabilityStatus.OFFLINE);

      expect(updated.availabilityStatus).toBe(DriverAvailabilityStatus.OFFLINE);
    });
  });
});
