import { BookingType } from '@prisma/client';

export interface LocationCoordinates {
  latitude: number;
  longitude: number;
  address?: string | null;
  label?: string | null;
}

export interface RouteEstimateInput {
  pickup: LocationCoordinates;
  dropoff?: LocationCoordinates | null;
  bookingType?: BookingType;
}

export interface RouteEstimate {
  distanceMeters: number;
  distanceKm: number;
  durationSeconds: number;
  durationMinutes: number;
  provider: 'DETERMINISTIC_DEVELOPMENT' | 'GOOGLE_MAPS' | 'OPEN_ROUTE_SERVICE' | 'MAPBOX';
  isEstimate: boolean;
}

export interface PricingRulesConfig {
  baseFare: string;
  perKilometerRate: string;
  perMinuteRate: string;
  minimumFare: string;
  platformFee: string;
  hourlyRate: string;
  dailyRate: string;
  weeklyRate: string;
  monthlyRate: string;
}

export interface PricingCalculationInput {
  bookingType: BookingType;
  estimatedDistanceKm?: number | null;
  estimatedDurationMinutes?: number | null;
  actualDurationMinutes?: number | null;
  numberOfDays?: number | null;
  numberOfWeeks?: number | null;
  numberOfMonths?: number | null;
  hourlyPackageHours?: number | null;
  hireDurationMinutes?: number | null;
  config: PricingRulesConfig;
}

export interface FareBreakdown {
  baseFareAmount: string;
  distanceFareAmount: string;
  durationFareAmount: string;
  packageAdjustmentAmount: string;
  minimumFareAmount: string;
  platformFeeAmount: string;
  subtotalAmount: string;
  totalFareAmount: string;
}

export interface PricingQuoteSnapshot {
  bookingType: BookingType;
  rates: PricingRulesConfig;
  route: RouteEstimate;
  breakdown: FareBreakdown;
  calculatedAt: string;
}
