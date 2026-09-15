import type { TripSignalType, LocationFreshness, ConfidenceLevel } from './trip-intelligence-types';

export class TripRiskService {
  evaluateConfidence(freshness: LocationFreshness, signalType: TripSignalType): ConfidenceLevel {
    if (signalType === 'SAFETY_REQUIRED') {
      return 'HIGH';
    }

    if (freshness === 'LIVE') {
      return 'HIGH';
    }
    if (freshness === 'RECENT') {
      return 'MEDIUM';
    }

    return 'LOW';
  }
}
