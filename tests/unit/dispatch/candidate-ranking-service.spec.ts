import type { Db } from '@/shared/database/prisma';
import {
  rankCandidateDrivers,
  classifyLocationFreshness,
  classifyLocationConfidence,
} from '@/modules/dispatch/application/candidate-ranking-service';
import { CandidateDriverSignalInput } from '@/modules/dispatch/domain/candidate-ranking-types';

describe('Phase 55 — Candidate Ranking Service Unit Tests', () => {
  const now = new Date('2026-09-17T12:00:00Z');

  describe('classifyLocationFreshness', () => {
    it('returns LIVE for locations updated within 30 seconds', () => {
      const captured = new Date(now.getTime() - 15 * 1000);
      expect(classifyLocationFreshness(captured, now)).toBe('LIVE');
    });

    it('returns RECENT for locations updated between 31 and 120 seconds', () => {
      const captured = new Date(now.getTime() - 60 * 1000);
      expect(classifyLocationFreshness(captured, now)).toBe('RECENT');
    });

    it('returns STALE for locations updated between 121 and 300 seconds', () => {
      const captured = new Date(now.getTime() - 200 * 1000);
      expect(classifyLocationFreshness(captured, now)).toBe('STALE');
    });

    it('returns UNAVAILABLE for locations updated > 300 seconds ago', () => {
      const captured = new Date(now.getTime() - 500 * 1000);
      expect(classifyLocationFreshness(captured, now)).toBe('UNAVAILABLE');
    });
  });

  describe('classifyLocationConfidence', () => {
    it('returns HIGH for accuracy <= 20m or null', () => {
      expect(classifyLocationConfidence(10)).toBe('HIGH');
      expect(classifyLocationConfidence(null)).toBe('HIGH');
    });

    it('returns MEDIUM for accuracy between 21m and 50m', () => {
      expect(classifyLocationConfidence(35)).toBe('MEDIUM');
    });

    it('returns LOW for accuracy > 50m', () => {
      expect(classifyLocationConfidence(80)).toBe('LOW');
    });
  });

  describe('rankCandidateDrivers', () => {
    const mockDb = {
      driverProfile: {
        findUnique: jest.fn().mockImplementation(({ where }: { where: { id: string } }) =>
          Promise.resolve({
            id: where.id,
            firstName: 'John',
            lastName: 'Doe',
            dateOfBirth: new Date('1990-01-01'),
            primaryServiceArea: 'Mumbai',
            drivingExperienceYears: 5,
            onboardingStatus: 'COMPLETED',
            approvalStatus: 'APPROVED',
            availabilityStatus: 'AVAILABLE',
            user: { accountStatus: 'ACTIVE' },
            complianceRecords: [],
            documents: [
              { documentType: 'DRIVING_LICENSE', status: 'VERIFIED' },
              { documentType: 'AADHAAR_CARD', status: 'VERIFIED' },
            ],
          }),
        ),
      },
      bookingAssignmentAttempt: {
        groupBy: jest.fn().mockResolvedValue([]),
      },
    } as unknown as Db;

    it('ranks eligible candidates deterministically by scoring ETA, distance, and freshness', async () => {
      const candidates: CandidateDriverSignalInput[] = [
        {
          driverProfileId: 'driver-1',
          displayName: 'Driver One',
          latitude: 19.076,
          longitude: 72.8777,
          accuracy: 10,
          capturedAt: new Date(now.getTime() - 10 * 1000), // LIVE
          availabilityStatus: 'AVAILABLE',
        },
        {
          driverProfileId: 'driver-2',
          displayName: 'Driver Two',
          latitude: 19.08,
          longitude: 72.88,
          accuracy: 15,
          capturedAt: new Date(now.getTime() - 50 * 1000), // RECENT
          availabilityStatus: 'AVAILABLE',
        },
      ];

      const ranked = await rankCandidateDrivers(
        candidates,
        {
          pickupLatitude: 19.076,
          pickupLongitude: 72.8777,
        },
        mockDb,
        now,
      );

      expect(ranked.length).toBeGreaterThan(0);
      expect(ranked[0].driverProfileId).toBe('driver-1');
      expect(ranked[0].score).toBeGreaterThan(ranked[1]?.score ?? 0);
    });

    it('gives preference bonus to customer preferred driver', async () => {
      const candidates: CandidateDriverSignalInput[] = [
        {
          driverProfileId: 'driver-1',
          displayName: 'Driver One',
          latitude: 19.076,
          longitude: 72.8777,
          accuracy: 10,
          capturedAt: new Date(now.getTime() - 10 * 1000),
          availabilityStatus: 'AVAILABLE',
        },
        {
          driverProfileId: 'driver-pref',
          displayName: 'Preferred Driver',
          latitude: 19.077,
          longitude: 72.878,
          accuracy: 10,
          capturedAt: new Date(now.getTime() - 10 * 1000),
          availabilityStatus: 'AVAILABLE',
        },
      ];

      const ranked = await rankCandidateDrivers(
        candidates,
        {
          pickupLatitude: 19.076,
          pickupLongitude: 72.8777,
          preferredDriverProfileId: 'driver-pref',
        },
        mockDb,
        now,
      );

      expect(ranked[0].driverProfileId).toBe('driver-pref');
      expect(ranked[0].factors.isPreferredDriver).toBe(true);
    });
  });
});
