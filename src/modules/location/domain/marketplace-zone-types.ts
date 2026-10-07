export interface MarketplaceZoneCoverage {
  zoneId: string;
  zoneCode: string;
  zoneName: string;
  status: 'ACTIVE' | 'INACTIVE';
  centerLatitude: number;
  centerLongitude: number;
  radiusMeters: number;
  isCovered: boolean;
  distanceFromCenterMeters: number;
  availableVehicleCategories: string[];
  estimatedDriverArrivalMins: number;
  activeDriverSupplyCount: number;
  openBookingDemandCount: number;
}

export interface CreateMarketplaceZoneInput {
  code: string;
  name: string;
  description?: string;
  centerLatitude: number;
  centerLongitude: number;
  radiusMeters: number;
  status?: 'ACTIVE' | 'INACTIVE';
}

export interface ZoneAnalyticsDTO {
  zoneId: string;
  code: string;
  name: string;
  activeDriversCount: number;
  activeBookingsCount: number;
  demandSupplyRatio: number;
  status: string;
}
