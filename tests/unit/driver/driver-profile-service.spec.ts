import {
  getOrCreateDriverProfile,
  updateDriverProfile,
  getDriverProfileById,
  updateDriverRatesByAdmin,
} from '@/modules/driver/application/services/driver-profile-service';
import { DriverOnboardingStatus } from '@prisma/client';
import { DriverProfileNotFoundError } from '@/modules/driver/domain/errors';

const mockTx = {
  driverProfile: {
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  },
};

jest.mock('@/shared/database/prisma', () => ({
  prisma: {
    driverProfile: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    $transaction: jest.fn((cb: (tx: unknown) => unknown) => cb(mockTx)),
  },
}));

jest.mock('@/shared/audit/audit-service', () => ({
  recordAuditLog: jest.fn(),
}));

jest.mock('@/shared/outbox/outbox-service', () => ({
  insertOutboxEvent: jest.fn(),
}));

jest.mock('@/shared/config/configuration-service', () => ({
  getInteger: jest.fn().mockResolvedValue(18),
}));

jest.mock('@/modules/identity/infrastructure/user-repository', () => ({
  getContactInfoForUsers: jest.fn(),
}));

import { prisma } from '@/shared/database/prisma';
import { getContactInfoForUsers } from '@/modules/identity/infrastructure/user-repository';
import { insertOutboxEvent } from '@/shared/outbox/outbox-service';

describe('DriverProfileService', () => {
  const mockFindUnique = prisma.driverProfile.findUnique as jest.Mock;
  const mockCreate = prisma.driverProfile.create as jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    mockTx.driverProfile.findUnique.mockReset();
    mockTx.driverProfile.create.mockReset();
    mockTx.driverProfile.update.mockReset();
  });

  describe('getOrCreateDriverProfile', () => {
    it('returns existing driver profile if present', async () => {
      const existingProfile = { id: 'dp-1', userId: 'user-1', drivingLicenseNumber: 'PENDING' };
      mockFindUnique.mockResolvedValue(existingProfile);

      const result = await getOrCreateDriverProfile('user-1');

      expect(result).toEqual(existingProfile);
      expect(mockCreate).not.toHaveBeenCalled();
    });

    it('creates new driver profile if not found', async () => {
      mockFindUnique.mockResolvedValue(null);
      const newProfile = { id: 'dp-2', userId: 'user-2', drivingLicenseNumber: 'PENDING-user-2' };
      mockCreate.mockResolvedValue(newProfile);

      const result = await getOrCreateDriverProfile('user-2');

      expect(result).toEqual(newProfile);
      expect(mockCreate).toHaveBeenCalled();
    });
  });

  describe('updateDriverProfile', () => {
    it('updates driver profile and records audit log', async () => {
      const profile = {
        id: 'dp-1',
        userId: 'user-1',
        firstName: 'John',
        onboardingStatus: DriverOnboardingStatus.NOT_STARTED,
      };
      mockTx.driverProfile.findUnique.mockResolvedValue(profile);
      mockTx.driverProfile.update.mockResolvedValue({
        ...profile,
        firstName: 'Johnny',
        drivingExperienceYears: 3,
      });

      const updated = await updateDriverProfile(
        'user-1',
        { firstName: 'Johnny', drivingExperienceYears: 3 },
        { ipAddress: '127.0.0.1' },
      );

      expect(updated.firstName).toBe('Johnny');
      expect(mockTx.driverProfile.update).toHaveBeenCalled();
    });
  });

  describe('getDriverProfileById', () => {
    it('throws DriverProfileNotFoundError if profile does not exist', async () => {
      mockFindUnique.mockResolvedValue(null);
      await expect(getDriverProfileById('dp-99')).rejects.toThrow(DriverProfileNotFoundError);
    });

    it('enriches the returned user with contact info from UserIdentity', async () => {
      mockFindUnique.mockResolvedValue({
        id: 'dp-1',
        userId: 'user-1',
        user: { id: 'user-1', accountStatus: 'ACTIVE' },
        documents: [],
      });
      (getContactInfoForUsers as jest.Mock).mockResolvedValue(
        new Map([['user-1', { email: 'driver@example.com', phoneNumber: '+919876543210' }]]),
      );

      const result = await getDriverProfileById('dp-1');

      expect(result.user.email).toBe('driver@example.com');
      expect(result.user.phoneNumber).toBe('+919876543210');
    });

    it('returns null contact fields when the user has no email/phone identity yet', async () => {
      mockFindUnique.mockResolvedValue({
        id: 'dp-1',
        userId: 'user-1',
        user: { id: 'user-1', accountStatus: 'ACTIVE' },
        documents: [],
      });
      (getContactInfoForUsers as jest.Mock).mockResolvedValue(new Map());

      const result = await getDriverProfileById('dp-1');

      expect(result.user.email).toBeNull();
      expect(result.user.phoneNumber).toBeNull();
    });
  });

  describe('updateDriverRatesByAdmin', () => {
    it('updates hire rates, records an audit log, and emits driver.rate_updated for the notification handler', async () => {
      mockTx.driverProfile.findUnique.mockResolvedValue({
        id: 'dp-1',
        userId: 'user-1',
        dailyHireRate: null,
        weeklyHireRate: null,
        monthlyHireRate: null,
      });
      mockTx.driverProfile.update.mockResolvedValue({
        id: 'dp-1',
        userId: 'user-1',
        dailyHireRate: { toString: () => '2500' },
        weeklyHireRate: { toString: () => '15000' },
        monthlyHireRate: null,
      });

      const updated = await updateDriverRatesByAdmin(
        'admin-1',
        'dp-1',
        { dailyHireRate: 2500, weeklyHireRate: 15000 },
        { ipAddress: '127.0.0.1' },
      );

      expect(updated.dailyHireRate?.toString()).toBe('2500');
      expect(insertOutboxEvent).toHaveBeenCalledWith(
        mockTx,
        expect.objectContaining({
          eventType: 'driver.rate_updated',
          payload: expect.objectContaining({
            userId: 'user-1',
            dailyHireRate: '2500',
            weeklyHireRate: '15000',
          }),
        }),
      );
    });

    it('throws DriverProfileNotFoundError for a driver that does not exist', async () => {
      mockTx.driverProfile.findUnique.mockResolvedValue(null);

      await expect(
        updateDriverRatesByAdmin('admin-1', 'dp-missing', { dailyHireRate: 1000 }),
      ).rejects.toThrow(DriverProfileNotFoundError);
    });
  });
});
