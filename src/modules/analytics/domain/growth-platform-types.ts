export interface CustomerLifecycleUnit {
  cacAmount: number; // Customer Acquisition Cost (in INR)
  ltvAmount: number; // Customer Lifetime Value (in INR)
  ltvCacRatio: number; // LTV / CAC multiplier
  churnRatePercent: number;
  netPromoterScore: number; // -100 to +100
  customerHealthGrade: 'HEALTHY' | 'MODERATE' | 'AT_RISK';
}

export interface ReactivationCampaignCohort {
  cohortId: string;
  segmentName: string;
  inactiveDaysThreshold: number;
  totalTargetUsers: number;
  targetedOfferCode: string;
  projectedReactivationRatePercent: number;
}

export interface SupplyDemandCoordinationUnit {
  activeDriverSupplyCount: number;
  activeBookingDemandCount: number;
  imbalanceScore: number; // 1.0 = balanced, >1.5 = high demand, <0.7 = high supply
  surgeMultiplier: number;
  actionRecommended: string;
}

export interface FeatureAdoptionCSAT {
  featureName: string;
  activeUsersCount: number;
  adoptionRatePercent: number;
  csatRating: number; // out of 5.0
}

export interface UnifiedGrowthPlatformSummaryDTO {
  customerLifecycle: CustomerLifecycleUnit;
  reactivationCampaigns: ReactivationCampaignCohort[];
  supplyDemandBalance: SupplyDemandCoordinationUnit;
  featureAdoption: FeatureAdoptionCSAT[];
  overallPlatformScore: number; // 0 - 100
  generatedAt: string;
}
