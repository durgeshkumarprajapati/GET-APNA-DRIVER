import {
  updateDriverLocation,
  removeDriverFromLiveIndex,
  addDriverToLiveIndex,
} from '@/modules/location/application/driver-location-service';
import {
  AccuracyThresholdExceededError,
  LocationRateLimitError,
  LocationStaleError,
} from '@/modules/location/domain/errors';
import { DriverNotEligibleError } from '@/modules/driver/domain/errors';

jest.mock('@/shared/database/prisma', () => ({
  prisma: {
    driverCurrentLocation: {
      upsert: jest.fn(),
      findUnique: jest.fn(),
    },
    driverLocationHistory: {
      create: jest.fn(),
    },
  },
}));

jest.mock('@/shared/redis/client', () => ({
  redis: {
    get: jest.fn(),
    set: jest.fn(),
    geoadd: jest.fn(),
    zrem: jest.fn(),
    del: jest.fn(),
  },
}));

jest.mock('@/shared/audit/audit-service', () => ({
  recordAuditLog: jest.fn(),
}));

jest.mock('@/shared/outbox/outbox-service', () => ({
  insertOutboxEvent: jest.fn(),
}));

jest.mock('@/shared/config/configuration-service', () => ({
  getInteger: jest.fn().mockImplementation((key: string, defaultValue: number) => {
    if (key === 'location.driver.max_accuracy_meters') return Promise.resolve(100);
    if (key === 'location.driver.update_min_interval_seconds') return Promise.resolve(5);
    if (key === 'location.driver.stale_after_seconds') return Promise.resolve(60);
    if (key === 'location.history.sample_min_interval_seconds') return Promise.resolve(60);
    return Promise.resolve(defaultValue);
  }),
}));

jest.mock('@/modules/driver/application/services/driver-profile-service', () => ({
  getOrCreateDriverProfile: jest.fn().mockResolvedValue({
    id: 'dp-1',
    userId: 'user-1',
    availabilityStatus: 'AVAILABLE',
  }),
}));

jest.mock('@/modules/driver/application/services/driver-eligibility-service', () => ({
  evaluateDriverEligibility: jest.fn(),
}));

import { prisma } from '@/shared/database/prisma';
import { redis } from '@/shared/redis/client';
import { evaluateDriverEligibility } from '@/modules/driver/application/services/driver-eligibility-service';

describe('DriverLocationService', () => {
  const mockUpsert = prisma.driverCurrentLocation.upsert as jest.Mock;
  const mockFindUnique = prisma.driverCurrentLocation.findUnique as jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('updateDriverLocation', () => {
    it('updates driver location successfully when eligible and available', async () => {
      (evaluateDriverEligibility as jest.Mock).mockResolvedValue({ isEligible: true, reasons: [] });
      (redis.get as jest.Mock).mockResolvedValue(null);
      mockUpsert.mockResolvedValue({
        id: 'dcl-1',
        driverProfileId: 'dp-1',
        latitude: 28.6139,
        longitude: 77.209,
      });

      const res = await updateDriverLocation('user-1', {
        latitude: 28.6139,
        longitude: 77.209,
        accuracy: 15,
      });

      expect(res.latitude).toBe(28.6139);
      expect(redis.geoadd).toHaveBeenCalledWith('driver:geo:available', 77.209, 28.6139, 'dp-1');
      expect(mockUpsert).toHaveBeenCalled();
    });

    it('rejects location update if accuracy exceeds max threshold', async () => {
      await expect(
        updateDriverLocation('user-1', {
          latitude: 28.6139,
          longitude: 77.209,
          accuracy: 250, // max is 100
        }),
      ).rejects.toThrow(AccuracyThresholdExceededError);
    });

    it('rejects location update if rate limit interval is violated', async () => {
      // Simulate last update 2 seconds ago (min interval is 5s)
      (redis.get as jest.Mock).mockResolvedValue((Date.now() - 2000).toString());

      await expect(
        updateDriverLocation('user-1', {
          latitude: 28.6139,
          longitude: 77.209,
          accuracy: 10,
        }),
      ).rejects.toThrow(LocationRateLimitError);
    });

    it('rejects location update if capturedAt timestamp is stale', async () => {
      (redis.get as jest.Mock).mockResolvedValue(null);
      const staleTime = new Date(Date.now() - 120000); // 120s ago (stale after 60s)

      await expect(
        updateDriverLocation('user-1', {
          latitude: 28.6139,
          longitude: 77.209,
          accuracy: 10,
          capturedAt: staleTime,
        }),
      ).rejects.toThrow(LocationStaleError);
    });

    it('rejects location update if driver eligibility check fails', async () => {
      (redis.get as jest.Mock).mockResolvedValue(null);
      (evaluateDriverEligibility as jest.Mock).mockResolvedValue({
        isEligible: false,
        reasons: ['Driver license unverified.'],
      });

      await expect(
        updateDriverLocation('user-1', {
          latitude: 28.6139,
          longitude: 77.209,
          accuracy: 10,
        }),
      ).rejects.toThrow(DriverNotEligibleError);
    });
  });

  describe('removeDriverFromLiveIndex', () => {
    it('removes driver from redis GEO set and metadata keys', async () => {
      await removeDriverFromLiveIndex('dp-1');

      expect(redis.zrem).toHaveBeenCalledWith('driver:geo:available', 'dp-1');
      expect(redis.del).toHaveBeenCalledWith('driver:last-location:dp-1');
    });
  });

  describe('addDriverToLiveIndex', () => {
    it('indexes driver from database last known location into redis GEO set', async () => {
      mockFindUnique.mockResolvedValue({
        driverProfileId: 'dp-1',
        latitude: 28.6139,
        longitude: 77.209,
        accuracy: 10,
        heading: 180,
        speed: 30,
        capturedAt: new Date(),
      });

      await addDriverToLiveIndex('dp-1');

      expect(redis.geoadd).toHaveBeenCalledWith('driver:geo:available', 77.209, 28.6139, 'dp-1');
    });
  });
});
