export interface CityExpansionScoreDTO {
  cityName: string;
  state: string;
  demandLevel: 'HIGH' | 'MEDIUM' | 'VERY_HIGH';
  driverSupplyLevel: 'LOW' | 'BALANCED' | 'HIGH';
  conversionRatePercent: number;
  opportunityRating: 'VERY_HIGH' | 'HIGH' | 'MODERATE';
  recommendedAction: string;
}

export interface MarketplaceExpansionReportDTO {
  citiesEvaluated: CityExpansionScoreDTO[];
  topExpansionCandidate: CityExpansionScoreDTO;
  demandHeatmapHotspots: Array<{ name: string; lat: number; lng: number; intensityScore: number }>;
  capacityPlanningNotes: string;
}
