export type AIRole = 'CUSTOMER' | 'DRIVER';

export type CustomerAIIntent =
  | 'BOOK_RIDE'
  | 'REBOOK_RIDE'
  | 'SCHEDULE_RIDE'
  | 'RECURRING_RIDE'
  | 'CHECK_FARE'
  | 'FIND_PROMOTION'
  | 'CHECK_LOYALTY'
  | 'CHECK_REWARD'
  | 'CHECK_BOOKING'
  | 'TRACK_RIDE'
  | 'CALL_DRIVER'
  | 'CONTACT_SUPPORT'
  | 'CHECK_INVOICE'
  | 'FIND_FAVORITE_DRIVER'
  | 'VEHICLE_RECOMMENDATION'
  | 'EMERGENCY_SOS'
  | 'GENERAL_ASSISTANCE';

export type DriverAIIntent =
  | 'SHIFT_SUMMARY'
  | 'TODAY_BOOKINGS'
  | 'EARNINGS_SUMMARY'
  | 'INCENTIVE_PROGRESS'
  | 'GOAL_PROGRESS'
  | 'SCHEDULE_STATUS'
  | 'COMPLIANCE_STATUS'
  | 'DOCUMENT_STATUS'
  | 'TRIP_ASSISTANCE'
  | 'CUSTOMER_PICKUP'
  | 'SUPPORT'
  | 'SAFETY'
  | 'PERFORMANCE'
  | 'GENERAL_ASSISTANCE';

export type AIIntent = CustomerAIIntent | DriverAIIntent;

export interface MapCoordinateInput {
  latitude: number;
  longitude: number;
}

export interface AIRequestInput {
  userId: string;
  role: AIRole;
  message: string;
  conversationId?: string;
  locale?: string;
  userLocation?: MapCoordinateInput;
}

export interface AIDataReference {
  source: string;
  label: string;
  details?: string;
}

export type AIAssistantAction =
  | {
      type: 'PREFILL_BOOKING';
      payload: {
        pickupAddress?: string;
        dropoffAddress?: string;
        pickupLatitude?: number;
        pickupLongitude?: number;
        dropoffLatitude?: number;
        dropoffLongitude?: number;
        vehicleCategory?: string;
        scheduledAt?: string;
        estimatedPrice?: number;
      };
    }
  | {
      type: 'SHOW_PRICING';
      payload: {
        vehicleCategory: string;
        baseFare: number;
        estimatedTotal: number;
        distanceKm?: number;
        durationMinutes?: number;
      };
    }
  | {
      type: 'SHOW_PROMOTION';
      payload: {
        code: string;
        title: string;
        discountText: string;
        expiryDate?: string;
        eligible: boolean;
      };
    }
  | {
      type: 'SHOW_REWARD';
      payload: {
        currentPoints: number;
        tier: string;
        nextTierPoints: number;
        availableRewardsCount: number;
      };
    }
  | {
      type: 'SHOW_EARNINGS';
      payload: {
        todayEarnings: number;
        completedTripsCount: number;
        onlineHours?: number;
        periodLabel: string;
      };
    }
  | {
      type: 'SHOW_INCENTIVE';
      payload: {
        campaignName: string;
        currentProgress: number;
        targetRequirement: number;
        remainingTrips: number;
        potentialBonus: number;
        deadline?: string;
      };
    }
  | {
      type: 'SHOW_SCHEDULE';
      payload: {
        shiftStatus: string;
        nextShiftStart?: string;
        isDispatchEligible: boolean;
        scheduledBookingsCount: number;
      };
    }
  | {
      type: 'SHOW_PICKUP_MAP';
      payload: {
        bookingId: string;
        pickupAddress: string;
        pickupLatitude: number;
        pickupLongitude: number;
        customerName?: string;
      };
    }
  | {
      type: 'TRIGGER_SOS';
      payload: {
        bookingId?: string;
        emergencyMessage: string;
      };
    }
  | {
      type: 'OPEN_SUPPORT';
      payload: {
        category: string;
        defaultSubject: string;
      };
    };

export interface AIResponse {
  message: string;
  intent: AIIntent;
  confidence?: number;
  actions?: AIAssistantAction[];
  citations?: AIDataReference[];
  conversationId?: string;
}

export interface AIConfig {
  enabled: boolean;
  customerEnabled: boolean;
  driverEnabled: boolean;
  provider: 'development' | 'gemini' | 'openai';
  model: string;
  apiKey?: string;
  maxTokens: number;
  temperature: number;
  timeoutMs: number;
  customerRateLimitPerMinute: number;
  driverRateLimitPerMinute: number;
  maxMessageLength: number;
  maxContextItems: number;
}
