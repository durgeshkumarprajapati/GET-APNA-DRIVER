export interface GrowthCommandCenterDTO {
  customers: {
    newUsersCount: number;
    activatedUsersCount: number;
    firstBookingCount: number;
    repeatBookingRatePercent: number;
    retention30dRatePercent: number;
  };
  bookings: {
    startedCount: number;
    completedCount: number;
    abandonedCount: number;
    cancelledCount: number;
    completionRatePercent: number;
  };
  drivers: {
    activeCount: number;
    availableCount: number;
    activatedCount: number;
    retainedCount: number;
    supplyHealthStatus: string;
  };
  growth: {
    referralSignupsCount: number;
    referralConversionPercent: number;
    campaignRoiMultiplier: number;
    activeOffersCount: number;
    runningExperimentsCount: number;
  };
  quality: {
    averageCustomerRating: number;
    openComplaintsCount: number;
    supportTicketsResolvedCount: number;
    netPromoterScore: number;
  };
  generatedAt: string;
}
