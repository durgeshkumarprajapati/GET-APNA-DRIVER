export type CustomerLifecycleStage =
  | 'NEW'
  | 'FIRST_BOOKING'
  | 'COMPLETED_SERVICE'
  | 'SATISFIED'
  | 'REPEAT_BOOKING'
  | 'LOYAL'
  | 'ADVOCATE';

export interface RetentionActionTriggerDTO {
  triggerId: string;
  triggerType:
    | 'BOOK_AGAIN_REMINDER'
    | 'POST_SERVICE_FOLLOWUP'
    | 'SCHEDULED_SERVICE_REMINDER'
    | 'INACTIVE_REACTIVATION';
  title: string;
  message: string;
  actionUrl: string;
  discountOfferCode?: string;
  expiryHours: number;
}

export interface CustomerLifecycleStatusDTO {
  customerId: string;
  stage: CustomerLifecycleStage;
  totalCompletedRides: number;
  daysSinceLastRide: number;
  npsScore?: number;
  preferredDriverName?: string;
  activeReminders: RetentionActionTriggerDTO[];
  suggestedNextBooking?: {
    serviceType: string;
    pickupAddress: string;
    dropoffAddress: string;
    discountMessage: string;
  };
}
