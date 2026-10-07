import { evaluatePersonalizedShortcutRule } from '@/modules/experience/rules/personalized-shortcut-rule';
import { evaluateFavoriteDriverRule } from '@/modules/experience/rules/favorite-driver-rule';
import { evaluatePromotionRule } from '@/modules/experience/rules/promotion-rule';
import { ExperienceOrchestrationService } from '@/modules/experience/application/experience-orchestration-service';
import type { CustomerExperienceContext } from '@/modules/experience/domain/experience-context';

// Must exactly match the shape getCustomerExperienceContext really produces
// (completedBookings/eligiblePromotions/favoriteDrivers with driverName/
// rating/isAvailable) — an earlier version of this mock used field names
// (recentBookings/activePromotions, displayName/ratingAverage) that don't
// exist on CustomerExperienceContext at all, so the rules under test were
// silently reading undefined the whole time.
const baseContext: CustomerExperienceContext = {
  userId: 'cust-101',
  category: 'CUSTOMER',
  completedBookings: [
    {
      id: 'b-1',
      bookingType: 'MULTI_DAY',
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
      bookingType: 'WEEKLY',
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
  } as CustomerExperienceContext['customerPreference'],
};

jest.mock('@/modules/experience/application/experience-context-service', () => ({
  getCustomerExperienceContext: jest.fn(),
}));

jest.mock('@/modules/experience/application/experience-dismissal-service', () => ({
  getDismissedFingerprints: jest.fn().mockResolvedValue(new Set()),
}));

import { getCustomerExperienceContext } from '@/modules/experience/application/experience-context-service';

const mockGetContext = getCustomerExperienceContext as jest.Mock;

describe('Phase 89 — Personalized Customer Experience & Recommendation Engine', () => {
  beforeEach(() => {
    mockGetContext.mockResolvedValue(baseContext);
  });

  it('evaluatePersonalizedShortcutRule surfaces a multi-day/outstation rebooking shortcut with an explainability reason, distinct from book-again', () => {
    const shortcuts = evaluatePersonalizedShortcutRule(baseContext);

    expect(shortcuts.length).toBeGreaterThan(0);
    expect(shortcuts[0].reason.toLowerCase()).toContain('outstation');
    expect(shortcuts[0].fingerprint).not.toBe(`cust-101:BOOK_AGAIN:b-1:v1`);
  });

  it('evaluatePersonalizedShortcutRule returns nothing when personalizedShortcutsEnabled is off', () => {
    const shortcuts = evaluatePersonalizedShortcutRule({
      ...baseContext,
      customerPreference: {
        ...baseContext.customerPreference,
        personalizedShortcutsEnabled: false,
      } as CustomerExperienceContext['customerPreference'],
    });

    expect(shortcuts).toEqual([]);
  });

  it('evaluateFavoriteDriverRule generates a recommendation with an explainability reason naming the driver', () => {
    const rec = evaluateFavoriteDriverRule(baseContext);

    expect(rec).not.toBeNull();
    expect(rec?.title).toContain('Durgesh Prajapati');
    expect(rec?.reason).toContain('Durgesh Prajapati');
  });

  it('evaluateFavoriteDriverRule respects favoriteDriverSuggestionsEnabled=false', () => {
    const rec = evaluateFavoriteDriverRule({
      ...baseContext,
      customerPreference: {
        ...baseContext.customerPreference,
        favoriteDriverSuggestionsEnabled: false,
      } as CustomerExperienceContext['customerPreference'],
    });

    expect(rec).toBeNull();
  });

  it('evaluatePromotionRule generates a recommendation with an explainability reason naming the code', () => {
    const rec = evaluatePromotionRule(baseContext);

    expect(rec).not.toBeNull();
    expect(rec?.title).toContain('WEEKEND15');
    expect(rec?.reason).toContain('WEEKEND15');
  });

  it('evaluatePromotionRule respects promotionSuggestionsEnabled=false', () => {
    const rec = evaluatePromotionRule({
      ...baseContext,
      customerPreference: {
        ...baseContext.customerPreference,
        promotionSuggestionsEnabled: false,
      } as CustomerExperienceContext['customerPreference'],
    });

    expect(rec).toBeNull();
  });

  it('ExperienceOrchestrationService generates customer recommendations with explainability reasons, and never duplicates the same subject across two cards', async () => {
    const recommendations =
      await ExperienceOrchestrationService.generateCustomerExperiences('cust-101');

    expect(recommendations.length).toBeGreaterThan(0);
    expect(recommendations.every((r) => r.reason.length > 0)).toBe(true);

    // Exactly one FAVORITE_DRIVER and one PROMOTION card for the same
    // underlying driver/promo — regression guard for the duplicate-card bug
    // (two rules independently recommending favoriteDrivers[0]/
    // eligiblePromotions[0] under different fingerprints).
    const favoriteDriverCards = recommendations.filter((r) => r.type === 'FAVORITE_DRIVER');
    const promotionCards = recommendations.filter((r) => r.type === 'PROMOTION');
    expect(favoriteDriverCards.length).toBeLessThanOrEqual(1);
    expect(promotionCards.length).toBeLessThanOrEqual(1);
  });

  it('ExperienceOrchestrationService suppresses every personalized card when personalizationEnabled is false', async () => {
    mockGetContext.mockResolvedValue({
      ...baseContext,
      customerPreference: {
        ...baseContext.customerPreference,
        personalizationEnabled: false,
      } as CustomerExperienceContext['customerPreference'],
    });

    const recommendations =
      await ExperienceOrchestrationService.generateCustomerExperiences('cust-101');

    expect(recommendations.some((r) => r.type === 'FAVORITE_DRIVER')).toBe(false);
    expect(recommendations.some((r) => r.type === 'PROMOTION')).toBe(false);
    expect(recommendations.some((r) => r.type === 'BOOK_AGAIN')).toBe(false);
  });
});
