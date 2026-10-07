export interface ParsedConcierge2RequestDTO {
  prompt: string;
  understoodDetails: {
    scheduledDate: string;
    scheduledTime: string;
    serviceType: string;
    recipientName: string;
    pickupLocation: string;
    vehicleCategory: string;
  };
  backendValidation: {
    isValid: boolean;
    estimatedPriceAmount: number;
    currency: string;
    availabilityConfirmed: boolean;
    surgeMultiplier: number;
    validationMessages: string[];
  };
  confirmationToken: string;
}

export interface Concierge2ConfirmInput {
  confirmationToken: string;
  isCustomerConfirmed: boolean;
}

export interface Concierge2ConfirmResultDTO {
  success: boolean;
  bookingId?: string;
  message: string;
  status: 'BOOKING_CREATED' | 'CANCELLED_BY_CUSTOMER';
}
