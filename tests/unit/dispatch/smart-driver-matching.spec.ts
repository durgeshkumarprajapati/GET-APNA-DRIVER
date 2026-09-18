import {
  rankCandidateDrivers,
  classifyLocationFreshness,
  classifyLocationConfidence,
} from '@/modules/dispatch/application/candidate-ranking-service';
import { DriverAvailabilityStatus } from '@prisma/client';
import type { Db } from '@/shared/database/prisma';

jest.mock('@/modules/location-intelligence/application/eta-service', () => ({
  defaultETAService: {
    estimateETA: jest.fn().mockImplementation(({ origin, destination }) => {
      const latDiff = Math.abs(origin.latitude - destination.latitude);
      const lonDiff = Math.abs(origin.longitude - destination.longitude);
      const distEst = (latDiff + lonDiff) * 111;
      return Promise.resolve({ durationMinutes: Math.round(distEst * 3 + 2) });
    }),
  },
}));

jest.mock('@/modules/driver/application/services/driver-eligibility-service', () => ({
  evaluateDriverEligibility: jest.fn().mockImplementation((driverProfileId: string) => {
    if (driverProfileId === 'driver-ineligible' || driverProfileId === 'driver-unapproved') {
      return Promise.resolve({ isEligible: false, reasons: ['Ineligible or unapproved'] });
    }
    return Promise.resolve({ isEligible: true, reasons: [] });
  }),
}));

describe('Phase 59 — Smart Driver Matching & Candidate Ranking Unit Tests', () => {
  const referenceTime = new Date('2026-09-17T12:00:00.000Z');

  describe('Location Telemetry Classification', () => {
    it('classifies location freshness deterministically', () => {
      expect(classifyLocationFreshness(new Date('2026-09-17T11:59:45.000Z'), referenceTime)).toBe('LIVE');
      expect(classifyLocationFreshness(new Date('2026-09-17T11:58:30.000Z'), referenceTime)).toBe('RECENT');
      expect(classifyLocationFreshness(new Date('2026-09-17T11:56:00.000Z'), referenceTime)).toBe('STALE');
      expect(classifyLocationFreshness(new Date('2026-09-17T11:50:00.000Z'), referenceTime)).toBe('UNAVAILABLE');
    });

    it('classifies location confidence deterministically based on accuracy', () => {
      expect(classifyLocationConfidence(10)).toBe('HIGH');
      expect(classifyLocationConfidence(30)).toBe('MEDIUM');
      expect(classifyLocationConfidence(80)).toBe('LOW');
      expect(classifyLocationConfidence(null)).toBe('HIGH');
    });
  });

  describe('Multi-Factor Candidate Ranking', () => {
    const mockDb = {
      driverRatingSummary: {
        findMany: jest.fn().mockImplementation(({ where }) => {
          const ids: string[] = where.driverProfileId.in;
          return Promise.resolve(
            ids.map((id) => {
              if (id === 'driver-top-rated') {
                return { driverProfileId: id, averageRating: 4.9, totalReviews: 50 };
              }
              if (id === 'driver-low-rated') {
                return { driverProfileId: id, averageRating: 2.5, totalReviews: 20 };
              }
              return { driverProfileId: id, averageRating: 0, totalReviews: 0 };
            }),
          );
        }),
      },
      customerFavoriteDriver: {
        findMany: jest.fn().mockImplementation(({ where }) => {
          if (where.customerId === 'customer-fav' && where.driverProfileId.in.includes('driver-fav')) {
            return Promise.resolve([{ driverProfileId: 'driver-fav' }]);
          }
          return Promise.resolve([]);
        }),
      },
      bookingAssignmentAttempt: {
        groupBy: jest.fn().mockResolvedValue([]),
      },
      booking: {
        groupBy: jest.fn().mockResolvedValue([]),
      },
    } as unknown as Db;

    it('ranks eligible candidates deterministically by multi-factor scoring', async () => {
      const candidates = [
        {
          driverProfileId: 'driver-far',
          displayName: 'Far Driver',
          latitude: 19.2,
          longitude: 72.9,
          accuracy: 10,
          capturedAt: referenceTime,
          availabilityStatus: DriverAvailabilityStatus.AVAILABLE,
        },
        {
          driverProfileId: 'driver-near',
          displayName: 'Near Driver',
          latitude: 19.01,
          longitude: 72.85,
          accuracy: 5,
          capturedAt: referenceTime,
          availabilityStatus: DriverAvailabilityStatus.AVAILABLE,
        },
      ];

      const ranked = await rankCandidateDrivers(
        candidates,
        { pickupLatitude: 19.0, pickupLongitude: 72.84 },
        mockDb,
        referenceTime,
      );

      expect(ranked.length).toBe(2);
      expect(ranked[0].driverProfileId).toBe('driver-near');
      expect(ranked[0].score).toBeGreaterThan(ranked[1].score);
      expect(ranked[0].scoreBreakdown).toBeDefined();
      expect(ranked[0].explanation).toContain('Score');
    });

    it('boosts favorite driver score when candidate is eligible', async () => {
      const candidates = [
        {
          driverProfileId: 'driver-normal',
          displayName: 'Normal Driver',
          latitude: 19.01,
          longitude: 72.85,
          accuracy: 10,
          capturedAt: referenceTime,
          availabilityStatus: DriverAvailabilityStatus.AVAILABLE,
        },
        {
          driverProfileId: 'driver-fav',
          displayName: 'Fav Driver',
          latitude: 19.02,
          longitude: 72.86,
          accuracy: 10,
          capturedAt: referenceTime,
          availabilityStatus: DriverAvailabilityStatus.AVAILABLE,
        },
      ];

      const ranked = await rankCandidateDrivers(
        candidates,
        {
          pickupLatitude: 19.0,
          pickupLongitude: 72.84,
          customerId: 'customer-fav',
        },
        mockDb,
        referenceTime,
      );

      expect(ranked.length).toBe(2);
      expect(ranked[0].driverProfileId).toBe('driver-fav');
      expect(ranked[0].factors.isPreferredDriver).toBe(true);
      expect(ranked[0].scoreBreakdown.preferredBonusScore).toBe(25);
    });

    it('strictly excludes ineligible drivers even if they are favorite or high rated', async () => {
      const candidates = [
        {
          driverProfileId: 'driver-ineligible',
          displayName: 'Ineligible Fav Driver',
          latitude: 19.001,
          longitude: 72.841,
          accuracy: 5,
          capturedAt: referenceTime,
          availabilityStatus: DriverAvailabilityStatus.AVAILABLE,
        },
        {
          driverProfileId: 'driver-eligible',
          displayName: 'Eligible Driver',
          latitude: 19.01,
          longitude: 72.85,
          accuracy: 10,
          capturedAt: referenceTime,
          availabilityStatus: DriverAvailabilityStatus.AVAILABLE,
        },
      ];

      const ranked = await rankCandidateDrivers(
        candidates,
        {
          pickupLatitude: 19.0,
          pickupLongitude: 72.84,
          preferredDriverProfileId: 'driver-ineligible',
        },
        mockDb,
        referenceTime,
      );

      expect(ranked.length).toBe(1);
      expect(ranked[0].driverProfileId).toBe('driver-eligible');
    });

    it('strictly excludes STALE location drivers from candidate pool', async () => {
      const staleTime = new Date('2026-09-17T11:55:00.000Z'); // 5 minutes old
      const candidates = [
        {
          driverProfileId: 'driver-stale',
          displayName: 'Stale Driver',
          latitude: 19.001,
          longitude: 72.841,
          accuracy: 5,
          capturedAt: staleTime,
          availabilityStatus: DriverAvailabilityStatus.AVAILABLE,
        },
      ];

      const ranked = await rankCandidateDrivers(
        candidates,
        { pickupLatitude: 19.0, pickupLongitude: 72.84 },
        mockDb,
        referenceTime,
      );

      expect(ranked.length).toBe(0);
    });
  });
});
