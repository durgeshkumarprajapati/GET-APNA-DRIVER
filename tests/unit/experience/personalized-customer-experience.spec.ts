import { evaluatePersonalizedShortcutRule } from '@/modules/experience/rules/personalized-shortcut-rule';
import { evaluateFavoriteDriverAvailabilityRule } from '@/modules/experience/rules/favorite-driver-availability-rule';
import { evaluateContextualPromotionRule } from '@/modules/experience/rules/contextual-promotion-rule';
import { ExperienceOrchestrationService } from '@/modules/experience/application/experience-orchestration-service';
import type { CustomerExperienceContext } from '@/modules/experience/domain/experience-context';

jest.mock('@/modules/experience/application/experience-context-service', () => ({
  getCustomerExperienceContext: jest.fn().mockResolvedValue({
    userId: 'cust-101',
    customerPreference: {
      personalizationEnabled: true,
      favoriteDriverSuggestionsEnabled: true,
      promotionSuggestionsEnabled: true,
      personalizedShortcutsEnabled: true,
    },
    recentBookings: [
      {
        id: 'b-1',
        bookingType: 'OUTSTATION',
        pickupLocation: { address: 'Vasant Kunj, Delhi' },
        dropoffLocation: { address: 'Jaipur City, Rajasthan' },
      },
      {
        id: 'b-2',
        bookingType: 'OUTSTATION',
        pickupLocation: { address: 'Vasant Kunj, Delhi' },
        dropoffLocation: { address: 'Agra Fort, UP' },
      },
    ],
    favoriteDrivers: [
      {
        driverProfileId: 'dp-101',
        displayName: 'Durgesh Prajapati',
        ratingAverage: 5.0,
      },
    ],
    activePromotions: [
      {
        id: 'promo-1',
        code: 'WEEKEND15',
        title: 'Weekend Outstation Special',
        discountPercentage: 15,
      },
    ],
  }),
}));

jest.mock('@/modules/experience/application/experience-dismissal-service', () => ({
  getDismissedFingerprints: jest.fn().mockResolvedValue(new Set()),
}));

describe('Phase 89 — Personalized Customer Experience & Recommendation Engine', () => {
  const baseContext: CustomerExperienceContext = {
    userId: 'cust-101',
    category: 'CUSTOMER',
    completedBookings: [
      {
        id: 'b-1',
        bookingType: 'OUTSTATION',
        pickupAddress: 'Vasant Kunj, Delhi',
        dropoffAddress: 'Jaipur City, Rajasthan',
        pickupLat: 28.5,
        pickupLng: 77.1,
        dropoffLat: 26.9,
        dropoffLng: 75.8,
        vehicleCategory: 'SUV',
        completedAt: new Date(),
      },
      {
        id: 'b-2',
        bookingType: 'OUTSTATION',
        pickupAddress: 'Vasant Kunj, Delhi',
        dropoffAddress: 'Agra Fort, UP',
        pickupLat: 28.5,
        pickupLng: 77.1,
        dropoffLat: 27.1,
        dropoffLng: 78.0,
        vehicleCategory: 'SEDAN',
        completedAt: new Date(),
      },
    ],
    favoriteDrivers: [
      {
        id: 'fav-1',
        driverProfileId: 'dp-101',
        driverName: 'Durgesh Prajapati',
        isAvailable: true,
        rating: 5.0,
      },
    ],
    eligiblePromotions: [
      {
        id: 'promo-1',
        code: 'WEEKEND15',
        title: 'Weekend Outstation Special',
        discountValue: '15% OFF',
        discountPercentage: 15,
      },
    ],
    savedLocations: [],
    scheduledRides: [],
    safetyAlerts: [],
    customerPreference: {
      personalizationEnabled: true,
      favoriteDriverSuggestionsEnabled: true,
      promotionSuggestionsEnabled: true,
      personalizedShortcutsEnabled: true,
    },
  };

  it('evaluatePersonalizedShortcutRule generates personalized shortcut with explainability reason', () => {
    const shortcuts = evaluatePersonalizedShortcutRule(baseContext);

    expect(shortcuts.length).toBeGreaterThan(0);
    expect(shortcuts[0].reason).toContain('Why this suggestion?');
    expect(shortcuts[0].reason).toContain('outstation');
  });

  it('evaluateFavoriteDriverAvailabilityRule generates favorite driver recommendation with explainability reason', () => {
    const rec = evaluateFavoriteDriverAvailabilityRule(baseContext);

    expect(rec).not.toBeNull();
    expect(rec?.title).toContain('Durgesh Prajapati');
    expect(rec?.reason).toContain('Why this suggestion?');
    expect(rec?.reason).toContain('5-star rating');
  });

  it('evaluateContextualPromotionRule generates promotion recommendation with explainability reason', () => {
    const rec = evaluateContextualPromotionRule(baseContext);

    expect(rec).not.toBeNull();
    expect(rec?.title).toContain('Weekend Outstation Special');
    expect(rec?.reason).toContain('Why this suggestion?');
    expect(rec?.reason).toContain('15% OFF');
  });

  it('ExperienceOrchestrationService generates customer recommendations and respects controls', async () => {
    const recommendations = await ExperienceOrchestrationService.generateCustomerExperiences('cust-101');

    expect(recommendations.length).toBeGreaterThan(0);
    expect(recommendations.some((r) => r.reason.includes('Why this suggestion?'))).toBe(true);
  });
});
