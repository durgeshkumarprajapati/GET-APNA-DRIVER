export interface RecentBookingShortcutDTO {
  bookingId: string;
  serviceType: string;
  pickupAddress: string;
  dropoffAddress: string;
  lastBookedDate: string;
  vehicleCategory: string;
  estimatedFare: number;
}

export interface CustomerBookingUX3DefaultsDTO {
  defaultServiceType: 'ONE_WAY' | 'ROUND_TRIP' | 'HOURLY' | 'FULL_DAY';
  defaultPickupAddress: string;
  defaultDropoffAddress?: string;
  savedPlaces: Array<{ name: string; address: string; lat: number; lng: number }>;
  savedRecipients: Array<{ id: string; fullName: string; phone: string; relationship: string }>;
  preferredVehicleCategory: 'HATCHBACK' | 'SEDAN' | 'SUV' | 'LUXURY';
  recentShortcuts: RecentBookingShortcutDTO[];
}

export interface QuickBookUX3Input {
  serviceType: 'ONE_WAY' | 'ROUND_TRIP' | 'HOURLY' | 'FULL_DAY';
  pickupAddress: string;
  pickupLat: number;
  pickupLng: number;
  dropoffAddress?: string;
  dropoffLat?: number;
  dropoffLng?: number;
  vehicleCategory: 'HATCHBACK' | 'SEDAN' | 'SUV' | 'LUXURY';
  recipientId?: string;
  scheduledTime?: string;
  couponCode?: string;
}

export interface QuickBookUX3ResponseDTO {
  success: boolean;
  bookingDraftId: string;
  estimatedFare: number;
  discountAmount: number;
  finalFare: number;
  estimatedDriverEtaMins: number;
  priceBreakdown: {
    baseFare: number;
    distanceFare: number;
    taxes: number;
    discount: number;
    finalFare: number;
  };
  summary: {
    serviceType: string;
    routeText: string;
    vehicleCategory: string;
    scheduledTime: string;
    recipientName: string;
  };
  metrics: {
    avgStepsToBook: number; // 2 steps
    estimatedBookingTimeSeconds: number; // 15s
  };
}
