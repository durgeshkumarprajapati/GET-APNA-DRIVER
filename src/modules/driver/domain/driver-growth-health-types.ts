export interface DriverFunnelStageDTO {
  stageName: 'SUBMITTED' | 'DOCUMENTS_VERIFIED' | 'ACTIVATED';
  count: number;
  conversionRatePercent: number;
}

export interface DriverGrowthHealthReportDTO {
  marketplaceSupplyStatus: 'SUFFICIENT' | 'SUPPLY_DEFICIT' | 'SURPLUS';
  totalActiveDrivers: number;
  totalAvailableDrivers: number;
  driverActivationFunnel: DriverFunnelStageDTO[];
  driverRetentionRate7dPercent: number;
  driverRetentionRate30dPercent: number;
  peakHourSupplyCoveragePercent: number;
  marketplaceHealthAnswer: string; // e.g. "Do we have enough good drivers to support the customers we are acquiring?"
}
