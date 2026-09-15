import type { AIRole, AIIntent } from './ai-types';

export interface AIPolicyRule {
  allowedIntents: AIIntent[];
  denyInternalIds: boolean;
  denyDirectMutations: boolean;
}

const CUSTOMER_POLICY: AIPolicyRule = {
  allowedIntents: [
    'BOOK_RIDE',
    'REBOOK_RIDE',
    'SCHEDULE_RIDE',
    'RECURRING_RIDE',
    'CHECK_FARE',
    'FIND_PROMOTION',
    'CHECK_LOYALTY',
    'CHECK_REWARD',
    'CHECK_BOOKING',
    'TRACK_RIDE',
    'CALL_DRIVER',
    'CONTACT_SUPPORT',
    'CHECK_INVOICE',
    'FIND_FAVORITE_DRIVER',
    'VEHICLE_RECOMMENDATION',
    'EMERGENCY_SOS',
    'GENERAL_ASSISTANCE',
  ],
  denyInternalIds: true,
  denyDirectMutations: true,
};

const DRIVER_POLICY: AIPolicyRule = {
  allowedIntents: [
    'SHIFT_SUMMARY',
    'TODAY_BOOKINGS',
    'EARNINGS_SUMMARY',
    'INCENTIVE_PROGRESS',
    'GOAL_PROGRESS',
    'SCHEDULE_STATUS',
    'COMPLIANCE_STATUS',
    'DOCUMENT_STATUS',
    'TRIP_ASSISTANCE',
    'CUSTOMER_PICKUP',
    'SUPPORT',
    'SAFETY',
    'PERFORMANCE',
    'GENERAL_ASSISTANCE',
  ],
  denyInternalIds: true,
  denyDirectMutations: true,
};

export class AIPolicyService {
  isIntentAllowed(role: AIRole, intent: AIIntent): boolean {
    const policy = role === 'CUSTOMER' ? CUSTOMER_POLICY : DRIVER_POLICY;
    return policy.allowedIntents.includes(intent);
  }

  getPolicy(role: AIRole): AIPolicyRule {
    return role === 'CUSTOMER' ? CUSTOMER_POLICY : DRIVER_POLICY;
  }
}
