export interface ServiceQualityTrustDetailsDTO {
  whoIsComing: {
    driverName: string;
    avatarUrl: string;
    rating: number;
    completedRides: number;
    verificationBadges: string[];
    vehicleInfo: string;
  };
  whatTheyCanDo: {
    vehicleCapabilities: string[];
    experienceYears: number;
    languagesSpoken: string[];
  };
  whatItCosts: {
    baseRate: string;
    perKmRate: string;
    nightSurgePolicy: string;
    cancellationPolicy: string;
  };
  whatIfSomethingGoesWrong: {
    emergencySosButton: boolean;
    supportHelpline: string;
    paymentProtectionGuarantee: string;
    incidentEscalationPolicy: string;
  };
}
