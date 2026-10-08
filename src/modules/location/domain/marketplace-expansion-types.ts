export interface CityExpansionScoreDTO {
  cityName: string;
  state: string;
  demandLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'VERY_HIGH';
  driverSupplyLevel: 'LOW' | 'BALANCED' | 'HIGH';
  conversionRatePercent: number;
  opportunityRating: 'LOW' | 'MODERATE' | 'HIGH' | 'VERY_HIGH';
  recommendedAction: string;
}

export interface MarketplaceExpansionReportDTO {
  citiesEvaluated: CityExpansionScoreDTO[];
  topExpansionCandidate?: CityExpansionScoreDTO;
  demandHeatmapHotspots: Array<{ name: string; lat: number; lng: number; intensityScore: number }>;
  capacityPlanningNotes: string;
}
