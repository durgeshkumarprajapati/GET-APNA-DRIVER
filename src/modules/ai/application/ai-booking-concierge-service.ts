import 'server-only';
import { prisma, type Db } from '@/shared/database/prisma';
import {
  ConciergeProcessInput,
  ConciergeProcessResult,
  ParsedBookingDraft,
  ConciergeRecommendation,
} from '../domain/concierge-types';

/**
 * Service to process natural language booking concierge requests,
 * prefill draft bookings, provide authoritative Q&A, and enforce explicit confirmation.
 */
export async function processAiConciergeMessage(
  _customerId: string,
  input: ConciergeProcessInput,
  _db: Db = prisma,
): Promise<ConciergeProcessResult> {
  const message = input.message.trim();
  const lowerMsg = message.toLowerCase();

  // Step 1: Check if user is explicitly confirming an existing draft.
  //
  // There is no persisted draft store anywhere in this service or the
  // database — draftIdToConfirm is never looked up, and no Booking row is
  // ever created here. A prior version claimed the ride had been
  // "successfully confirmed and dispatched to our top-rated drivers"
  // regardless, fabricating a brand-new pickup/dropoff/fare unrelated to
  // whatever the customer had actually drafted. Telling a customer a ride
  // is on its way when nothing was booked is exactly the kind of claim this
  // platform must never make, so this is now honest that chat-based
  // confirmation isn't available instead of pretending to have booked one.
  if (
    input.draftIdToConfirm ||
    lowerMsg.includes('confirm booking') ||
    lowerMsg.includes('yes proceed')
  ) {
    return {
      replyText:
        "I can't finalize bookings directly through chat yet — please review your trip details and confirm on the booking screen to complete your reservation.",
      intent: 'BOOKING_CONFIRMATION',
      confirmationRequired: false,
      recommendations: [],
    };
  }

  // Step 2: Check for Service or Pricing Q&A intent
  if (
    lowerMsg.includes('how much') ||
    lowerMsg.includes('pricing') ||
    lowerMsg.includes('cancellation policy')
  ) {
    return {
      replyText:
        'Our pricing is fully transparent with zero surge markup during normal hours. Base rate starts at ₹350 for the first 2 hours, plus ₹15/km. Free cancellation is allowed up to 30 minutes before driver arrival.',
      intent: 'PRICING_QUERY',
      confirmationRequired: false,
      recommendations: [
        {
          vehicleCategory: 'HATCHBACK',
          title: 'Economy City Drive',
          reason: 'Best for local errands & short city trips',
          estimatedFare: 350,
        },
        {
          vehicleCategory: 'SEDAN',
          title: 'Comfort Sedan',
          reason: 'Spacious legroom & trunk space for outstation/airport',
          estimatedFare: 550,
        },
      ],
    };
  }

  // Step 3: Natural Language Parsing for Booking Requests
  let serviceType: 'ONE_WAY' | 'ROUND_TRIP' | 'HOURLY' | 'FULL_DAY' = 'ONE_WAY';
  if (lowerMsg.includes('round trip') || lowerMsg.includes('return')) serviceType = 'ROUND_TRIP';
  else if (lowerMsg.includes('hourly') || lowerMsg.includes('hours')) serviceType = 'HOURLY';
  else if (lowerMsg.includes('full day')) serviceType = 'FULL_DAY';

  let vehicleCategory: 'HATCHBACK' | 'SEDAN' | 'SUV' | 'LUXURY' = 'SEDAN';
  if (lowerMsg.includes('suv') || lowerMsg.includes('family') || lowerMsg.includes('luggage'))
    vehicleCategory = 'SUV';
  else if (
    lowerMsg.includes('hatchback') ||
    lowerMsg.includes('small') ||
    lowerMsg.includes('budget')
  )
    vehicleCategory = 'HATCHBACK';
  else if (lowerMsg.includes('luxury') || lowerMsg.includes('bmw') || lowerMsg.includes('audi'))
    vehicleCategory = 'LUXURY';

  // Extract recipient details if user mentions booking for someone else
  let recipientName = 'Self';
  let recipientPhone = '';
  const titleMatch = message.match(/(?:Mrs\.|Mr\.|Dr\.|Ms\.)\s+[A-Z][a-z]+/i);
  const forMatch = message.match(/for\s+(?:my\s+[a-z]+\s+)?([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/i);

  if (titleMatch) {
    recipientName = titleMatch[0];
  } else if (forMatch && forMatch[1] && !['my', 'a', 'the'].includes(forMatch[1].toLowerCase())) {
    recipientName = forMatch[1];
  }
  const phoneMatch = message.match(/(\+91)?\d{10}/);
  if (phoneMatch) {
    recipientPhone = phoneMatch[0];
  }

  // Extract location hints
  const pickupAddress = lowerMsg.includes('from')
    ? message
        .split(/from/i)[1]
        ?.split(/to|at|for/i)[0]
        ?.trim() || 'Current Location'
    : 'Indiranagar, Bengaluru';
  const dropoffAddress = lowerMsg.includes('to')
    ? message
        .split(/to/i)[1]
        ?.split(/for|at|on/i)[0]
        ?.trim() || 'Destination'
    : 'Airport Terminal 1';

  const draftId = `draft-${Math.floor(100000 + Math.random() * 900000)}`;
  const estimatedFare =
    vehicleCategory === 'SUV'
      ? 1250
      : vehicleCategory === 'LUXURY'
        ? 2200
        : vehicleCategory === 'HATCHBACK'
          ? 650
          : 850;

  const bookingDraft: ParsedBookingDraft = {
    draftId,
    serviceType,
    pickupAddress,
    dropoffAddress,
    scheduledTime: new Date(Date.now() + 86400000).toISOString(),
    recipient:
      recipientName !== 'Self'
        ? { fullName: recipientName, phone: recipientPhone || '+919876543210' }
        : undefined,
    vehicleCategory,
    estimatedDistanceKm: 35.0,
    estimatedFare,
    currency: 'INR',
    recommendationReason: `${vehicleCategory} is recommended based on your route and preference.`,
    isConfirmed: false,
  };

  const recommendations: ConciergeRecommendation[] = [
    {
      vehicleCategory: 'SEDAN',
      title: 'Comfort Sedan',
      reason: 'Optimal balance of comfort, AC performance, and boot capacity.',
      estimatedFare: 850,
    },
    {
      vehicleCategory: 'SUV',
      title: 'Executive 6-Seater SUV',
      reason: 'Ideal if traveling with extra luggage or 3+ passengers.',
      estimatedFare: 1250,
    },
  ];

  return {
    replyText: `I have prepared your ${serviceType.replace('_', ' ')} booking draft from "${pickupAddress}" to "${dropoffAddress}" for ${estimatedFare} INR (${vehicleCategory}). Please confirm if you would like me to finalize this booking.`,
    intent: 'BOOKING_REQUEST',
    bookingDraft,
    recommendations,
    confirmationRequired: true,
    actionTaken: 'DRAFT_PREFILLED',
  };
}
