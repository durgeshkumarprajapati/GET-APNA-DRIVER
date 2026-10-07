import { processAiConciergeMessage } from '@/modules/ai/application/ai-booking-concierge-service';

describe('Phase 95 — AI Booking Concierge 2.0', () => {
  it('parses natural language booking requests and prefills draft booking details', async () => {
    const prompt =
      'I need an SUV tomorrow at 9 AM from Koramangala to Airport for my mother Mrs. Sharma';
    const result = await processAiConciergeMessage('cust-101', { message: prompt });

    expect(result.intent).toBe('BOOKING_REQUEST');
    expect(result.confirmationRequired).toBe(true);
    expect(result.bookingDraft).toBeDefined();
    expect(result.bookingDraft?.vehicleCategory).toBe('SUV');
    expect(result.bookingDraft?.recipient?.fullName).toBe('Mrs. Sharma');
    expect(result.recommendations.length).toBeGreaterThan(0);
  });

  it('answers pricing catalog queries with authoritative transparent answers', async () => {
    const prompt = 'How much is the pricing and what is the cancellation policy?';
    const result = await processAiConciergeMessage('cust-101', { message: prompt });

    expect(result.intent).toBe('PRICING_QUERY');
    expect(result.replyText).toContain('transparent');
    expect(result.replyText).toContain('cancellation');
    expect(result.confirmationRequired).toBe(false);
  });

  it('never claims a booking was dispatched — there is no draft store or booking creation behind this intent', async () => {
    const prompt = 'Yes confirm booking';
    const result = await processAiConciergeMessage('cust-101', {
      message: prompt,
      draftIdToConfirm: 'draft-999',
    });

    expect(result.intent).toBe('BOOKING_CONFIRMATION');
    // A prior version fabricated a brand-new pickup/dropoff/fare here and
    // claimed it had been "confirmed and dispatched to our top-rated
    // drivers" — nothing is actually booked, so this must never report
    // actionTaken: 'BOOKING_CREATED' or an isConfirmed draft again.
    expect(result.actionTaken).toBeUndefined();
    expect(result.bookingDraft).toBeUndefined();
    expect(result.replyText.toLowerCase()).not.toContain('dispatched');
  });
});
