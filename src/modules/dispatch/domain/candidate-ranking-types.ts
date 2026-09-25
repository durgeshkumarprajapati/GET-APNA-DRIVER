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
  vehicleCategory?: string | null;
  vehicleType?: string | null;
}

export interface CandidateScoreBreakdown {
  etaScore: number;
  distanceScore: number;
  freshnessScore: number;
  confidenceScore: number;
  preferredBonusScore: number;
  ratingScore: number;
  reliabilityScore: number;
  fairnessScore: number;
  vehicleMatchScore: number;
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
  averageRating: number | null;
  totalReviews: number;
  ratingScore: number;
  reliabilityScore: number;
  vehicleCategoryMatch: boolean;
  vehicleMatchScore: number;
  fairnessScore: number;
  etaScore: number;
  distanceScore: number;
  freshnessScore: number;
  confidenceScore: number;
  preferredBonusScore: number;
}

export interface RankedCandidate {
  driverProfileId: string;
  displayName: string | null;
  latitude: number;
  longitude: number;
  score: number;
  factors: CandidateRankingFactors;
  scoreBreakdown: CandidateScoreBreakdown;
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
  cancelledBy?: string | null;
  cancellationReason?: string | null;
  isDriverRejected?: boolean;
}
