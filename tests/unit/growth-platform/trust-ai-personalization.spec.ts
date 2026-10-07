import { getServiceQualityTrustDetails } from '@/modules/customer/application/services/service-quality-trust-service';
import {
  parseAndValidateAiConcierge2,
  confirmAiConcierge2Booking,
} from '@/modules/ai/application/services/ai-concierge2-service';
import {
  getPersonalization2Settings,
  togglePersonalization2State,
} from '@/modules/customer/application/services/personalization2-service';

describe('Phases 107, 108 & 109 — Service Quality, AI Concierge 2.0 & Personalization 2.0', () => {
  it('Phase 107: provides full pre-booking transparency breakdown', async () => {
    const details = await getServiceQualityTrustDetails();
    expect(details.whoIsComing.driverName).toBeDefined();
    expect(details.whatTheyCanDo.experienceYears).toBeGreaterThan(0);
    expect(details.whatItCosts.cancellationPolicy).toBeDefined();
    expect(details.whatIfSomethingGoesWrong.emergencySosButton).toBe(true);
  });

  it('Phase 108: AI concierge parses request, validates with backend, and confirms booking', async () => {
    const parsed = await parseAndValidateAiConcierge2('cust-101', 'I need a driver tomorrow morning at 8 for my parents');

    expect(parsed.understoodDetails.recipientName).toBe('Parents');
    expect(parsed.backendValidation.isValid).toBe(true);
    expect(parsed.confirmationToken).toBeDefined();

    const confirmed = await confirmAiConcierge2Booking('cust-101', {
      confirmationToken: parsed.confirmationToken,
      isCustomerConfirmed: true,
    });

    expect(confirmed.success).toBe(true);
    expect(confirmed.status).toBe('BOOKING_CREATED');
  });

  it('Phase 109: provides personalization settings with Why Am I Seeing This reasons and OFF toggle', async () => {
    const settings = await getPersonalization2Settings('cust-101');
    expect(settings.shortcuts[0].whyAmISeeingThisReason).toBeDefined();

    const toggled = await togglePersonalization2State('cust-101', false);
    expect(toggled.isPersonalizationEnabled).toBe(false);
    expect(toggled.message).toContain('OFF');
  });
});
