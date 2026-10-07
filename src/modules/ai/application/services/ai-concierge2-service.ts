import 'server-only';
import { prisma, type Db } from '@/shared/database/prisma';
import {
  ParsedConcierge2RequestDTO,
  Concierge2ConfirmInput,
  Concierge2ConfirmResultDTO,
} from '../../domain/concierge2-types';

/**
 * Phase 108 — AI Concierge 2.0 Service
 *
 * This still only does lightweight keyword parsing (same technique as the
 * Phase 95 concierge, not a new NLP/geocoding feature) — it cannot actually
 * determine a real date/time, a real fare, or real driver availability from
 * free text alone, so unlike a prior version, it no longer *claims* to have
 * done so. "Canonical pricing engine validated fare" / "Driver availability
 * confirmed in pickup zone" were asserted unconditionally here with no
 * pricing engine or availability check ever run — the exact fabrication
 * class this platform's Phase 101 trust audit exists to catch. This now
 * labels its output as an indicative estimate that still requires going
 * through the real booking screen to get a real fare and real driver match.
 */
export async function parseAndValidateAiConcierge2(
  customerId: string,
  prompt: string,
  _db: Db = prisma,
): Promise<ParsedConcierge2RequestDTO> {
  const lowerPrompt = prompt.toLowerCase();

  let recipientName = 'Self';
  if (
    lowerPrompt.includes('parent') ||
    lowerPrompt.includes('mother') ||
    lowerPrompt.includes('father')
  ) {
    recipientName = 'Parents';
  } else if (
    lowerPrompt.includes('wife') ||
    lowerPrompt.includes('husband') ||
    lowerPrompt.includes('friend')
  ) {
    recipientName = 'Family / Friend';
  }

  let vehicleCategory = 'SEDAN';
  if (lowerPrompt.includes('suv')) vehicleCategory = 'SUV';
  else if (lowerPrompt.includes('hatchback')) vehicleCategory = 'HATCHBACK';

  // Neither a real date/time nor a real pickup location can be extracted
  // from free text without a real NLP/geocoding integration (out of scope
  // here) — labeled as unresolved rather than a specific invented value.
  const scheduledDate = 'To be confirmed on the booking screen';
  const scheduledTime = 'To be confirmed on the booking screen';
  const estimatedPriceAmount = vehicleCategory === 'SUV' ? 850 : 650;

  const confirmationToken = `tok-ai2-${customerId.substring(0, 8)}-${Date.now()}`;

  return {
    prompt,
    understoodDetails: {
      scheduledDate,
      scheduledTime,
      serviceType: 'ONE_WAY',
      recipientName,
      pickupLocation: 'To be confirmed on the booking screen',
      vehicleCategory,
    },
    backendValidation: {
      // "Valid" only means the prompt was parseable, not that pricing or
      // availability were actually checked.
      isValid: true,
      estimatedPriceAmount,
      currency: 'INR',
      availabilityConfirmed: false,
      surgeMultiplier: 1.0,
      validationMessages: [
        'This is an indicative estimate based on vehicle category only, not a validated fare.',
        'Driver availability has not been checked — confirm on the booking screen to see real availability and pricing.',
      ],
    },
    confirmationToken,
  };
}

/**
 * There is no persisted draft/confirmation-token store anywhere in this
 * service or the database, and no Booking row is ever created here. A
 * prior version claimed every confirmation "successfully validated and
 * created" a real booking with a fabricated bookingId — this is the same
 * class of lie Phase 95's concierge made before it was fixed to be honest.
 * Chat-based booking confirmation isn't implemented, so this says so
 * instead of fabricating a dispatch.
 */
export async function confirmAiConcierge2Booking(
  _customerId: string,
  input: Concierge2ConfirmInput,
  _db: Db = prisma,
): Promise<Concierge2ConfirmResultDTO> {
  if (!input.isCustomerConfirmed) {
    return {
      success: false,
      message: 'Booking request was cancelled by customer.',
      status: 'CANCELLED_BY_CUSTOMER',
    };
  }

  return {
    success: false,
    message:
      "I can't finalize bookings directly through chat yet — please review your trip details and confirm on the booking screen to complete your reservation.",
    status: 'NOT_AVAILABLE',
  };
}
