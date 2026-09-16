export interface CustomerExperienceContext {
  userId: string;
  category: 'CUSTOMER';
  completedBookings: Array<{
    id: string;
    pickupAddress: string;
    dropoffAddress: string;
    pickupLat: number;
    pickupLng: number;
    dropoffLat: number;
    dropoffLng: number;
    vehicleCategory: string;
    completedAt: Date;
    driverProfileId?: string;
    driverName?: string;
  }>;
  activeBooking?: {
    id: string;
    status: string;
    pickupAddress: string;
    dropoffAddress: string;
    driverProfileId?: string;
    driverName?: string;
  } | null;
  savedLocations: Array<{
    id: string;
    label: string;
    address: string;
    lat: number;
    lng: number;
  }>;
  favoriteDrivers: Array<{
    id: string;
    driverProfileId: string;
    driverName: string;
    isAvailable: boolean;
    rating: number;
  }>;
  scheduledRides: Array<{
    id: string;
    pickupAddress: string;
    dropoffAddress: string;
    scheduledTime: Date;
    status: string;
  }>;
  loyaltyAccount?: {
    pointsBalance: number;
    tier: string;
    pointsToNextTier: number;
    availableRewardsCount: number;
  } | null;
  eligiblePromotions: Array<{
    code: string;
    title: string;
    discountValue: string;
    expiresAt?: Date | null;
  }>;
  referralCode?: {
    code: string;
    referralsCompleted: number;
    totalEarned: string;
  } | null;
  safetyAlerts: Array<{
    id: string;
    type: string;
    severity: string;
    title: string;
  }>;
}

export interface DriverExperienceContext {
  userId: string;
  driverProfileId: string;
  category: 'DRIVER';
  isOnDuty: boolean;
  activeBooking?: {
    id: string;
    status: string;
    pickupAddress: string;
    dropoffAddress: string;
    customerName?: string;
  } | null;
  todaysSchedule?: {
    shiftStart?: string;
    shiftEnd?: string;
    isAvailableToday: boolean;
  } | null;
  earningsSummary?: {
    todayEarnings: number;
    weeklyEarnings: number;
    completedTripsToday: number;
  } | null;
  incentiveCampaigns: Array<{
    id: string;
    title: string;
    targetTrips: number;
    completedTrips: number;
    bonusAmount: number;
    expiresAt?: Date | null;
  }>;
  goalPreference?: {
    dailyTargetAmount: number;
    weeklyTargetTrips: number;
  } | null;
  complianceStatus: {
    isFullyVerified: boolean;
    pendingDocumentsCount: number;
  };
  reliabilityIncidents: Array<{
    id: string;
    severity: string;
    message: string;
  }>;
}

export type ExperienceContext = CustomerExperienceContext | DriverExperienceContext;

export function isCustomerContext(
  context: ExperienceContext,
): context is CustomerExperienceContext {
  return context.category === 'CUSTOMER';
}

export function isDriverContext(context: ExperienceContext): context is DriverExperienceContext {
  return context.category === 'DRIVER';
}
