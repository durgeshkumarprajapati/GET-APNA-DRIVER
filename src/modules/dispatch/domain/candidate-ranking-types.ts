import { DriverAvailabilityStatus } from '@prisma/client';

export type LocationFreshnessClass = 'LIVE' | 'RECENT' | 'STALE' | 'UNAVAILABLE';
export type LocationConfidenceLevel = 'HIGH' | 'MEDIUM' | 'LOW';

export interface CandidateDriverSignalInput {
  driverProfileId: string;
  displayName: string | null;
  latitude: number;
  longitude: number;
  accuracy: number | null;
  capturedAt: Date;
  availabilityStatus: DriverAvailabilityStatus;
}

export interface CandidateRankingFactors {
  etaMinutes: number | null;
  distanceKm: number;
  freshnessClass: LocationFreshnessClass;
  confidenceLevel: LocationConfidenceLevel;
  isPreferredDriver: boolean;
  isScheduleCompatible: boolean;
  recentAssignmentCount: number;
  riskRestriction: boolean;
}

export interface RankedCandidate {
  driverProfileId: string;
  displayName: string | null;
  latitude: number;
  longitude: number;
  score: number;
  factors: CandidateRankingFactors;
  explanation: string;
}

export interface DispatchSearchState {
  bookingId: string;
  status: string;
  searchStartedAt: Date;
  searchDeadlineAt: Date;
  remainingSeconds: number;
  candidatePoolSize: number;
  rankedCandidatesCount: number;
  hasExpired: boolean;
}
