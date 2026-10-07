import type { Db } from '@/shared/database/prisma';
import { getServiceQualityTrustDetails } from '@/modules/customer/application/services/service-quality-trust-service';
import {
  parseAndValidateAiConcierge2,
  confirmAiConcierge2Booking,
} from '@/modules/ai/application/services/ai-concierge2-service';
import {
  getPersonalization2Settings,
  togglePersonalization2State,
} from '@/modules/customer/application/services/personalization2-service';
import {
  getOrCreateCustomerPreference,
  updateCustomerPreference,
} from '@/modules/customer/application/customer-preference-service';
import { ExperienceOrchestrationService } from '@/modules/experience/application/experience-orchestration-service';

jest.mock('@/modules/customer/application/customer-preference-service', () => ({
  getOrCreateCustomerPreference: jest.fn(),
  updateCustomerPreference: jest.fn(),
}));
jest.mock('@/modules/experience/application/experience-orchestration-service', () => ({
  ExperienceOrchestrationService: {
    generateCustomerExperiences: jest.fn(),
  },
}));

const mockGetOrCreateCustomerPreference = getOrCreateCustomerPreference as jest.Mock;
const mockUpdateCustomerPreference = updateCustomerPreference as jest.Mock;
const mockGenerateCustomerExperiences =
  ExperienceOrchestrationService.generateCustomerExperiences as jest.Mock;

type MockDb = Partial<Db> & Record<string, unknown>;

describe('Phases 107, 108 & 109 — Service Quality, AI Concierge 2.0 & Personalization 2.0', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Phase 107 — Service Quality & Trust', () => {
    it('never fabricates a specific driver identity when no driverProfileId resolves to a real driver', async () => {
      const details = await getServiceQualityTrustDetails(undefined, {} as Db);

      expect(details.whoIsComing.avatarUrl).toBeNull();
      expect(details.whoIsComing.verificationBadges).toEqual([]);
      expect(details.whoIsComing.rating).toBe(0);
      expect(details.whatIfSomethingGoesWrong.paymentProtectionGuarantee).not.toContain('100%');
      expect(details.whatIfSomethingGoesWrong.paymentProtectionGuarantee).not.toContain('escrow');
    });

    it("reflects a real driver's actual verification status and photo, never a stock photo or unearned badges", async () => {
      const mockDb: MockDb = {
        driverProfile: {
          findUnique: jest.fn().mockResolvedValue({
            id: 'drv-1',
            displayName: 'Suresh Patel',
            firstName: null,
            lastName: null,
            profileImageUrl: null,
            verificationStatus: 'VERIFIED',
            approvalStatus: 'APPROVED',
            drivingExperienceYears: 5,
            languagesSpoken: ['en', 'hi'],
            ratingSummary: { averageRating: '4.75' },
            vehicleCapabilities: [{ vehicleCategory: { name: 'Sedan' } }],
          }),
        } as unknown as Db['driverProfile'],
        booking: { count: jest.fn().mockResolvedValue(42) } as unknown as Db['booking'],
      };

      const details = await getServiceQualityTrustDetails('drv-1', mockDb as Db);

      expect(details.whoIsComing.driverName).toBe('Suresh Patel');
      expect(details.whoIsComing.avatarUrl).toBeNull();
      expect(details.whoIsComing.rating).toBe(4.75);
      expect(details.whoIsComing.completedRides).toBe(42);
      expect(details.whoIsComing.verificationBadges).toEqual([
        'Documents Verified',
        'Approved Partner',
      ]);
      expect(details.whatTheyCanDo.experienceYears).toBe(5);
      expect(details.whatTheyCanDo.languagesSpoken).toEqual(['en', 'hi']);
    });

    it('never claims a verification badge a driver does not actually hold', async () => {
      const mockDb: MockDb = {
        driverProfile: {
          findUnique: jest.fn().mockResolvedValue({
            id: 'drv-2',
            displayName: 'New Driver',
            verificationStatus: 'PENDING_VERIFICATION',
            approvalStatus: 'PENDING',
            drivingExperienceYears: 0,
            languagesSpoken: [],
            ratingSummary: null,
            vehicleCapabilities: [],
          }),
        } as unknown as Db['driverProfile'],
        booking: { count: jest.fn().mockResolvedValue(0) } as unknown as Db['booking'],
      };

      const details = await getServiceQualityTrustDetails('drv-2', mockDb as Db);

      expect(details.whoIsComing.verificationBadges).toEqual([]);
    });
  });

  describe('Phase 108 — AI Concierge 2.0', () => {
    it('labels its pricing/availability as unvalidated estimates, never claiming the canonical engine ran', async () => {
      const parsed = await parseAndValidateAiConcierge2(
        'cust-101',
        'I need a driver tomorrow morning at 8 for my parents',
      );

      expect(parsed.understoodDetails.recipientName).toBe('Parents');
      expect(parsed.backendValidation.availabilityConfirmed).toBe(false);
      expect(
        parsed.backendValidation.validationMessages.some((m) => m.includes('not a validated fare')),
      ).toBe(true);
      expect(parsed.confirmationToken).toBeDefined();
    });

    it('never claims a booking was created — there is no draft store or booking creation behind this intent', async () => {
      const confirmed = await confirmAiConcierge2Booking('cust-101', {
        confirmationToken: 'tok-ai2-abc',
        isCustomerConfirmed: true,
      });

      expect(confirmed.success).toBe(false);
      expect(confirmed.status).toBe('NOT_AVAILABLE');
      expect(confirmed.bookingId).toBeUndefined();
      expect(confirmed.message.toLowerCase()).not.toContain('dispatched');
    });

    it('reports cancellation honestly when the customer did not confirm', async () => {
      const confirmed = await confirmAiConcierge2Booking('cust-101', {
        confirmationToken: 'tok-ai2-abc',
        isCustomerConfirmed: false,
      });

      expect(confirmed.success).toBe(false);
      expect(confirmed.status).toBe('CANCELLED_BY_CUSTOMER');
    });
  });

  describe('Phase 109 — Personalization 2.0', () => {
    it('builds shortcuts from the real experience orchestration engine and persists the toggle for real', async () => {
      mockGetOrCreateCustomerPreference.mockResolvedValue({ personalizationEnabled: true });
      mockGenerateCustomerExperiences.mockResolvedValue([
        {
          id: 'rec-1',
          title: 'Outstation Driver: Home → Airport',
          description: 'Quickly book your recurring daily chauffeur service.',
          reason: "Shown because you've booked 3 outstation trips recently.",
          action: { targetUrl: '/bookings/new?bookAgain=bkg-1' },
        },
      ]);

      const mockDb: MockDb = {
        booking: { findMany: jest.fn().mockResolvedValue([]) } as unknown as Db['booking'],
        customerFavoriteDriver: {
          findFirst: jest.fn().mockResolvedValue(null),
        } as unknown as Db['customerFavoriteDriver'],
      };

      const settings = await getPersonalization2Settings('cust-101', mockDb as Db);

      expect(settings.isPersonalizationEnabled).toBe(true);
      expect(settings.shortcuts[0].whyAmISeeingThisReason).toBe(
        "Shown because you've booked 3 outstation trips recently.",
      );
      expect(settings.shortcuts[0].actionUrl).toBe('/bookings/new?bookAgain=bkg-1');

      mockUpdateCustomerPreference.mockResolvedValue({ personalizationEnabled: false });

      const toggled = await togglePersonalization2State('cust-101', false, mockDb as Db);

      expect(mockUpdateCustomerPreference).toHaveBeenCalledWith(
        'cust-101',
        { personalizationEnabled: false },
        null,
        mockDb,
      );
      expect(toggled.isPersonalizationEnabled).toBe(false);
      expect(toggled.message).toContain('OFF');
    });

    it('reports honest "no data yet" defaults instead of fabricated addresses/names when there is no booking history', async () => {
      mockGetOrCreateCustomerPreference.mockResolvedValue({ personalizationEnabled: true });
      mockGenerateCustomerExperiences.mockResolvedValue([]);

      const mockDb: MockDb = {
        booking: { findMany: jest.fn().mockResolvedValue([]) } as unknown as Db['booking'],
        customerFavoriteDriver: {
          findFirst: jest.fn().mockResolvedValue(null),
        } as unknown as Db['customerFavoriteDriver'],
      };

      const settings = await getPersonalization2Settings('cust-202', mockDb as Db);

      expect(settings.preferredService).toBe('No booking history yet');
      expect(settings.preferredPickupLocation).toBe('No booking history yet');
      expect(settings.preferredDriverName).toBeUndefined();
      expect(settings.shortcuts).toEqual([]);
    });
  });
});
