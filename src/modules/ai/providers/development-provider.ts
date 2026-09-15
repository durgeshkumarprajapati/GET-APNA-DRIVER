import type { AIResponse, AIIntent, AIAssistantAction, AIDataReference, AIRole } from '../ai-types';

export interface DevelopmentProviderInput {
  role: AIRole;
  intent: AIIntent;
  message: string;
  context: Record<string, unknown>;
  locale?: string;
}

export class DevelopmentProvider {
  async generateResponse(input: DevelopmentProviderInput): Promise<AIResponse> {
    const { role, intent, context } = input;
    const actions: AIAssistantAction[] = [];
    const citations: AIDataReference[] = [];

    if (role === 'CUSTOMER') {
      return this.handleCustomerIntent(intent, context, actions, citations);
    } else {
      return this.handleDriverIntent(intent, context, actions, citations);
    }
  }

  private handleCustomerIntent(
    intent: AIIntent,
    context: Record<string, unknown>,
    actions: AIAssistantAction[],
    citations: AIDataReference[]
  ): AIResponse {
    switch (intent) {
      case 'BOOK_RIDE':
      case 'REBOOK_RIDE': {
        const usual = context.usualRide as { pickup?: string; dropoff?: string; vehicle?: string } | undefined;
        const pickup = usual?.pickup || (context.pickupAddress as string) || 'Current Location';
        const dropoff = usual?.dropoff || (context.dropoffAddress as string) || 'Destination';
        const vehicleCategory = usual?.vehicle || 'Sedan';

        actions.push({
          type: 'PREFILL_BOOKING',
          payload: {
            pickupAddress: pickup,
            dropoffAddress: dropoff,
            vehicleCategory,
            estimatedPrice: 450,
          },
        });

        citations.push({
          source: 'BookingHistory',
          label: 'Recent Ride History',
          details: `Frequent route found: ${pickup} -> ${dropoff}`,
        });

        return {
          message: `I've prepared your booking draft from ${pickup} to ${dropoff} in a ${vehicleCategory}. Please review and confirm the details below.`,
          intent: 'BOOK_RIDE',
          confidence: 0.95,
          actions,
          citations,
        };
      }

      case 'CHECK_FARE': {
        const baseFare = 120;
        const estimatedTotal = 450;
        actions.push({
          type: 'SHOW_PRICING',
          payload: {
            vehicleCategory: 'Sedan',
            baseFare,
            estimatedTotal,
            distanceKm: 12.5,
            durationMinutes: 28,
          },
        });
        citations.push({
          source: 'PricingService',
          label: 'Authoritative Fare Quote Engine',
        });
        return {
          message: `The estimated fare for a Sedan trip is ₹${estimatedTotal} (Base fare ₹${baseFare}).`,
          intent: 'CHECK_FARE',
          confidence: 0.98,
          actions,
          citations,
        };
      }

      case 'FIND_PROMOTION': {
        const promo = context.promotion as { code?: string; title?: string; discountText?: string } | undefined;
        const code = promo?.code || 'WELCOME50';
        const title = promo?.title || '50% Off First 3 Rides';
        const discountText = promo?.discountText || '50% discount up to ₹100';

        actions.push({
          type: 'SHOW_PROMOTION',
          payload: {
            code,
            title,
            discountText,
            eligible: true,
          },
        });
        citations.push({
          source: 'PromotionService',
          label: 'Promotion Eligibility Engine',
        });
        return {
          message: `You have an active eligible coupon code: **${code}** (${title}). You can apply it at checkout!`,
          intent: 'FIND_PROMOTION',
          confidence: 0.95,
          actions,
          citations,
        };
      }

      case 'CHECK_LOYALTY':
      case 'CHECK_REWARD': {
        const loyalty = context.loyalty as { points?: number; tier?: string } | undefined;
        const points = loyalty?.points ?? 1840;
        const tier = loyalty?.tier || 'GOLD';

        actions.push({
          type: 'SHOW_REWARD',
          payload: {
            currentPoints: points,
            tier,
            nextTierPoints: 2000,
            availableRewardsCount: 3,
          },
        });
        citations.push({
          source: 'LoyaltyAccountService',
          label: 'Customer Loyalty Ledger',
        });
        return {
          message: `You currently have **${points} points** in tier **${tier}**. You need 160 more points to reach PLATINUM status.`,
          intent: 'CHECK_LOYALTY',
          confidence: 0.99,
          actions,
          citations,
        };
      }

      case 'EMERGENCY_SOS': {
        actions.push({
          type: 'TRIGGER_SOS',
          payload: {
            emergencyMessage: 'Safety alert triggered from AI Assistant',
          },
        });
        citations.push({
          source: 'SafetyModule',
          label: 'SOS Emergency Coordinator',
        });
        return {
          message: `⚠️ **Emergency Assistance Activated**. If you feel unsafe, please trigger the SOS button below immediately or dial 112.`,
          intent: 'EMERGENCY_SOS',
          confidence: 1.0,
          actions,
          citations,
        };
      }

      default: {
        return {
          message: `I'm your GET APNA DRIVER Customer Assistant. How can I assist you with your booking, promotions, loyalty rewards, or active trips today?`,
          intent: 'GENERAL_ASSISTANCE',
          confidence: 0.8,
          actions: [],
          citations: [],
        };
      }
    }
  }

  private handleDriverIntent(
    intent: AIIntent,
    context: Record<string, unknown>,
    actions: AIAssistantAction[],
    citations: AIDataReference[]
  ): AIResponse {
    switch (intent) {
      case 'SHIFT_SUMMARY': {
        actions.push({
          type: 'SHOW_SCHEDULE',
          payload: {
            shiftStatus: 'ACTIVE',
            isDispatchEligible: true,
            scheduledBookingsCount: 3,
          },
        });
        citations.push({
          source: 'DriverScheduleService',
          label: 'Driver Operational Shift Register',
        });
        return {
          message: `Good day! Your shift is active. You have 3 scheduled rides assigned today and are fully dispatch eligible.`,
          intent: 'SHIFT_SUMMARY',
          confidence: 0.98,
          actions,
          citations,
        };
      }

      case 'EARNINGS_SUMMARY': {
        const earnings = context.earnings as { todayEarnings?: number; completedTrips?: number } | undefined;
        const todayEarnings = earnings?.todayEarnings ?? 1450;
        const completedTripsCount = earnings?.completedTrips ?? 6;

        actions.push({
          type: 'SHOW_EARNINGS',
          payload: {
            todayEarnings,
            completedTripsCount,
            onlineHours: 5.5,
            periodLabel: "Today's Total",
          },
        });
        citations.push({
          source: 'DriverEarningsService',
          label: 'Ledger Settlement Engine',
        });
        return {
          message: `You've earned **₹${todayEarnings}** across **${completedTripsCount} completed trips** today!`,
          intent: 'EARNINGS_SUMMARY',
          confidence: 0.99,
          actions,
          citations,
        };
      }

      case 'INCENTIVE_PROGRESS': {
        actions.push({
          type: 'SHOW_INCENTIVE',
          payload: {
            campaignName: 'Weekend Peak Surge Bonus',
            currentProgress: 8,
            targetRequirement: 12,
            remainingTrips: 4,
            potentialBonus: 1200,
            deadline: 'Today at 23:59',
          },
        });
        citations.push({
          source: 'IncentiveCampaignService',
          label: 'Driver Incentive Campaign Engine',
        });
        return {
          message: `You've completed **8 of 12 rides** for the Weekend Surge Bonus. Complete 4 more rides today to unlock your **₹1,200 bonus**!`,
          intent: 'INCENTIVE_PROGRESS',
          confidence: 0.95,
          actions,
          citations,
        };
      }

      case 'CUSTOMER_PICKUP':
      case 'TRIP_ASSISTANCE': {
        const bookingId = (context.activeBookingId as string) || 'b-sample-123';
        const pickupAddress = (context.pickupAddress as string) || 'Airport Terminal 1, Vadodara';

        actions.push({
          type: 'SHOW_PICKUP_MAP',
          payload: {
            bookingId,
            pickupAddress,
            pickupLatitude: 22.3072,
            pickupLongitude: 73.1812,
            customerName: 'Rahul Patel',
          },
        });
        citations.push({
          source: 'BookingLocationService',
          label: 'Phase 43 Location Telemetry',
        });
        return {
          message: `Customer pickup location: **${pickupAddress}**. Tap below to view the location map.`,
          intent: 'CUSTOMER_PICKUP',
          confidence: 0.95,
          actions,
          citations,
        };
      }

      default: {
        return {
          message: `I'm your GET APNA DRIVER Copilot. Ask me about your shift summary, daily earnings, active incentive progress, or customer pickup details.`,
          intent: 'GENERAL_ASSISTANCE',
          confidence: 0.8,
          actions: [],
          citations: [],
        };
      }
    }
  }
}
