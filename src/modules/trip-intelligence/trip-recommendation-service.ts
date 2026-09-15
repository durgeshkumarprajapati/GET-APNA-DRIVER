import type {
  TripSignalType,
  TripIntelligenceAction,
  LocationFreshness,
} from './trip-intelligence-types';

export interface ActionBuilderInput {
  role: 'CUSTOMER' | 'DRIVER';
  signalType: TripSignalType;
  bookingId: string;
  pickupAddress: string;
  pickupLatitude: number;
  pickupLongitude: number;
  dropoffAddress?: string;
  driverLatitude?: number;
  driverLongitude?: number;
  finalFare?: number;
  earnedPoints?: number;
  freshness: LocationFreshness;
}

export class TripRecommendationService {
  generateActions(input: ActionBuilderInput): TripIntelligenceAction[] {
    const actions: TripIntelligenceAction[] = [];

    if (input.signalType === 'SAFETY_REQUIRED') {
      actions.push({
        type: 'CONTACT_SUPPORT',
        payload: {
          reason: 'Emergency Safety Alert Active',
          bookingId: input.bookingId,
        },
      });
      return actions;
    }

    if (input.signalType === 'TRIP_COMPLETED') {
      if (input.role === 'CUSTOMER') {
        if (input.finalFare) {
          actions.push({
            type: 'OPEN_INVOICE',
            payload: { finalFare: input.finalFare },
          });
        }
        actions.push({
          type: 'OPEN_REVIEW',
          payload: { bookingId: input.bookingId },
        });
        if (input.earnedPoints) {
          actions.push({
            type: 'OPEN_REWARD',
            payload: { earnedPoints: input.earnedPoints, totalPoints: 1840 },
          });
        }
        if (input.dropoffAddress) {
          actions.push({
            type: 'PREFILL_BOOKING',
            payload: {
              pickupAddress: input.pickupAddress,
              dropoffAddress: input.dropoffAddress,
            },
          });
        }
      } else {
        actions.push({
          type: 'SHOW_INCENTIVE',
          payload: {
            completedRides: 8,
            targetRides: 12,
            bonusAmount: 1200,
          },
        });
      }
      return actions;
    }

    // Active trip actions
    actions.push({
      type: 'SHOW_MAP',
      payload: {
        title: input.role === 'CUSTOMER' ? 'Live Driver Location' : 'Customer Pickup Location',
        pickupLatitude: input.pickupLatitude,
        pickupLongitude: input.pickupLongitude,
        driverLatitude: input.driverLatitude,
        driverLongitude: input.driverLongitude,
      },
    });

    if (input.role === 'CUSTOMER') {
      actions.push({
        type: 'CALL_DRIVER',
        payload: { bookingId: input.bookingId },
      });
    } else {
      actions.push({
        type: 'CALL_CUSTOMER',
        payload: { bookingId: input.bookingId },
      });
    }

    if (input.signalType === 'TRIP_DELAY_RISK' || input.signalType === 'SUPPORT_REQUIRED') {
      actions.push({
        type: 'CONTACT_SUPPORT',
        payload: {
          reason: 'Trip assistance or delay inquiry',
          bookingId: input.bookingId,
        },
      });
    }

    return actions;
  }
}
