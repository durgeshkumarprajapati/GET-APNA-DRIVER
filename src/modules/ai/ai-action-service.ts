import { z } from 'zod';
import type { AIAssistantAction } from './ai-types';

const PrefillBookingSchema = z.object({
  type: z.literal('PREFILL_BOOKING'),
  payload: z.object({
    pickupAddress: z.string().optional(),
    dropoffAddress: z.string().optional(),
    pickupLatitude: z.number().optional(),
    pickupLongitude: z.number().optional(),
    dropoffLatitude: z.number().optional(),
    dropoffLongitude: z.number().optional(),
    vehicleCategory: z.string().optional(),
    scheduledAt: z.string().optional(),
    estimatedPrice: z.number().optional(),
  }),
});

const ShowPricingSchema = z.object({
  type: z.literal('SHOW_PRICING'),
  payload: z.object({
    vehicleCategory: z.string(),
    baseFare: z.number(),
    estimatedTotal: z.number(),
    distanceKm: z.number().optional(),
    durationMinutes: z.number().optional(),
  }),
});

const ShowPromotionSchema = z.object({
  type: z.literal('SHOW_PROMOTION'),
  payload: z.object({
    code: z.string(),
    title: z.string(),
    discountText: z.string(),
    expiryDate: z.string().optional(),
    eligible: z.boolean(),
  }),
});

const ShowRewardSchema = z.object({
  type: z.literal('SHOW_REWARD'),
  payload: z.object({
    currentPoints: z.number(),
    tier: z.string(),
    nextTierPoints: z.number(),
    availableRewardsCount: z.number(),
  }),
});

const ShowEarningsSchema = z.object({
  type: z.literal('SHOW_EARNINGS'),
  payload: z.object({
    todayEarnings: z.number(),
    completedTripsCount: z.number(),
    onlineHours: z.number().optional(),
    periodLabel: z.string(),
  }),
});

const ShowIncentiveSchema = z.object({
  type: z.literal('SHOW_INCENTIVE'),
  payload: z.object({
    campaignName: z.string(),
    currentProgress: z.number(),
    targetRequirement: z.number(),
    remainingTrips: z.number(),
    potentialBonus: z.number(),
    deadline: z.string().optional(),
  }),
});

const ShowScheduleSchema = z.object({
  type: z.literal('SHOW_SCHEDULE'),
  payload: z.object({
    shiftStatus: z.string(),
    nextShiftStart: z.string().optional(),
    isDispatchEligible: z.boolean(),
    scheduledBookingsCount: z.number(),
  }),
});

const ShowPickupMapSchema = z.object({
  type: z.literal('SHOW_PICKUP_MAP'),
  payload: z.object({
    bookingId: z.string(),
    pickupAddress: z.string(),
    pickupLatitude: z.number(),
    pickupLongitude: z.number(),
    customerName: z.string().optional(),
  }),
});

const TriggerSOSSchema = z.object({
  type: z.literal('TRIGGER_SOS'),
  payload: z.object({
    bookingId: z.string().optional(),
    emergencyMessage: z.string(),
  }),
});

const OpenSupportSchema = z.object({
  type: z.literal('OPEN_SUPPORT'),
  payload: z.object({
    category: z.string(),
    defaultSubject: z.string(),
  }),
});

export const AIAssistantActionSchema = z.discriminatedUnion('type', [
  PrefillBookingSchema,
  ShowPricingSchema,
  ShowPromotionSchema,
  ShowRewardSchema,
  ShowEarningsSchema,
  ShowIncentiveSchema,
  ShowScheduleSchema,
  ShowPickupMapSchema,
  TriggerSOSSchema,
  OpenSupportSchema,
]);

export class AIActionService {
  validateActions(actions: unknown[]): AIAssistantAction[] {
    if (!Array.isArray(actions)) return [];

    const validActions: AIAssistantAction[] = [];

    for (const act of actions) {
      const parsed = AIAssistantActionSchema.safeParse(act);
      if (parsed.success) {
        validActions.push(parsed.data as AIAssistantAction);
      }
    }

    return validActions;
  }
}
