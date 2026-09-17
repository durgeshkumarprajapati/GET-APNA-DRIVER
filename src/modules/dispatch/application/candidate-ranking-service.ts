import 'server-only';
import { prisma, type Db } from '@/shared/database/prisma';
import { calculateHaversineDistance } from '@/modules/location/application/distance-service';
import { evaluateDriverEligibility } from '@/modules/driver/application/services/driver-eligibility-service';
import { defaultETAService } from '@/modules/location-intelligence/application/eta-service';
import {
  CandidateDriverSignalInput,
  RankedCandidate,
  CandidateRankingFactors,
  LocationFreshnessClass,
  LocationConfidenceLevel,
} from '../domain/candidate-ranking-types';

const SHORTLIST_ETA_LIMIT = 5;

/**
 * Classifies location freshness deterministically.
 * LIVE: <= 30 seconds
 * RECENT: 31-120 seconds
 * STALE: 121-300 seconds
 * UNAVAILABLE: > 300 seconds or missing
 */
export function classifyLocationFreshness(capturedAt: Date, now: Date = new Date()): LocationFreshnessClass {
  const diffSec = (now.getTime() - capturedAt.getTime()) / 1000;
  if (diffSec <= 30) return 'LIVE';
  if (diffSec <= 120) return 'RECENT';
  if (diffSec <= 300) return 'STALE';
  return 'UNAVAILABLE';
}

/**
 * Classifies location confidence deterministically based on GPS accuracy.
 * HIGH: accuracy <= 20m
 * MEDIUM: 21m - 50m
 * LOW: > 50m
 */
export function classifyLocationConfidence(accuracyMeters: number | null): LocationConfidenceLevel {
  if (accuracyMeters == null || accuracyMeters <= 20) return 'HIGH';
  if (accuracyMeters <= 50) return 'MEDIUM';
  return 'LOW';
}

export interface RankCandidatesOptions {
  pickupLatitude: number;
  pickupLongitude: number;
  preferredDriverProfileId?: string | null;
  customerId?: string | null;
}

/**
 * Ranks candidate drivers deterministically using multi-factor scoring.
 * Strict Rule: Eligibility is enforced FIRST. Ranking NEVER overrides eligibility.
 * Stale or unavailable drivers are strictly excluded.
 */
export async function rankCandidateDrivers(
  candidates: CandidateDriverSignalInput[],
  options: RankCandidatesOptions,
  db: Db = prisma,
): Promise<RankedCandidate[]> {
  const now = new Date();
  const eligibleCandidates: { candidate: CandidateDriverSignalInput; distanceKm: number; freshnessClass: LocationFreshnessClass; confidenceLevel: LocationConfidenceLevel }[] = [];

  // 1. Filter out ineligible candidates and stale locations
  for (const candidate of candidates) {
    // Re-check driver eligibility (account active, compliance, documents, schedule, trip conflicts)
    const eligibility = await evaluateDriverEligibility(candidate.driverProfileId, db);
    if (!eligibility.isEligible) {
      continue;
    }

    const freshnessClass = classifyLocationFreshness(candidate.capturedAt, now);
    // Exclude STALE and UNAVAILABLE locations from candidate pool
    if (freshnessClass === 'STALE' || freshnessClass === 'UNAVAILABLE') {
      continue;
    }

    const confidenceLevel = classifyLocationConfidence(candidate.accuracy);
    const distanceMeters = calculateHaversineDistance(
      options.pickupLatitude,
      options.pickupLongitude,
      candidate.latitude,
      candidate.longitude,
    );
    const distanceKm = distanceMeters / 1000;

    eligibleCandidates.push({
      candidate,
      distanceKm,
      freshnessClass,
      confidenceLevel,
    });
  }

  if (eligibleCandidates.length === 0) {
    return [];
  }

  // 2. Sort by straight-line distance to select top N shortlist for ETA calculation
  eligibleCandidates.sort((a, b) => a.distanceKm - b.distanceKm);
  const shortlist = eligibleCandidates.slice(0, SHORTLIST_ETA_LIMIT);

  // 3. Fetch recent assignment count (past 24h) for fairness calculation
  const driverProfileIds = shortlist.map((item) => item.candidate.driverProfileId);
  const recentAssignments = await db.bookingAssignmentAttempt.groupBy({
    by: ['driverProfileId'],
    where: {
      driverProfileId: { in: driverProfileIds },
      offeredAt: { gte: new Date(now.getTime() - 24 * 60 * 60 * 1000) },
    },
    _count: { id: true },
  });

  const assignmentCountMap = new Map<string, number>();
  for (const item of recentAssignments) {
    assignmentCountMap.set(item.driverProfileId, item._count.id);
  }

  // 4. Calculate score for each candidate in shortlist
  const ranked: RankedCandidate[] = [];

  for (const item of shortlist) {
    const { candidate, distanceKm, freshnessClass, confidenceLevel } = item;
    const isPreferred = options.preferredDriverProfileId === candidate.driverProfileId;

    // Calculate ETA (failsafe to straight-line estimation if external provider fails)
    let etaMinutes: number | null = null;
    try {
      const etaResult = await defaultETAService.estimateETA({
        origin: { latitude: candidate.latitude, longitude: candidate.longitude },
        destination: { latitude: options.pickupLatitude, longitude: options.pickupLongitude },
      });
      etaMinutes = etaResult.durationMinutes;
    } catch {
      // Fallback: estimate ~3 min per km + 2 min buffer
      etaMinutes = Math.round(distanceKm * 3 + 2);
    }

    const recentAssignmentCount = assignmentCountMap.get(candidate.driverProfileId) || 0;

    // Scoring weights (0 to 100 max score):
    // - ETA score: max 35 pts (lower ETA = higher score)
    const effectiveEta = etaMinutes ?? (distanceKm * 3 + 2);
    const etaScore = Math.max(0, 35 - effectiveEta * 2);

    // - Distance score: max 20 pts (lower distance = higher score)
    const distanceScore = Math.max(0, 20 - distanceKm * 2);

    // - Freshness score: LIVE = 15, RECENT = 10
    const freshnessScore = freshnessClass === 'LIVE' ? 15 : 10;

    // - Confidence score: HIGH = 10, MEDIUM = 7, LOW = 4
    const confidenceScore = confidenceLevel === 'HIGH' ? 10 : confidenceLevel === 'MEDIUM' ? 7 : 4;

    // - Preferred driver bonus: 10 pts
    const preferredBonus = isPreferred ? 10 : 0;

    // - Fairness / Starvation prevention: drivers with fewer recent offers get up to 10 pts
    const fairnessScore = Math.max(0, 10 - recentAssignmentCount * 2);

    const totalScore = Math.round(etaScore + distanceScore + freshnessScore + confidenceScore + preferredBonus + fairnessScore);

    const factors: CandidateRankingFactors = {
      etaMinutes,
      distanceKm: Math.round(distanceKm * 100) / 100,
      freshnessClass,
      confidenceLevel,
      isPreferredDriver: isPreferred,
      isScheduleCompatible: true,
      recentAssignmentCount,
      riskRestriction: false,
    };

    const explanation = `Score ${totalScore}: ETA ${etaMinutes ?? 'N/A'}m (${Math.round(etaScore)}pt), Dist ${factors.distanceKm}km (${Math.round(distanceScore)}pt), Freshness ${freshnessClass} (${freshnessScore}pt), Confidence ${confidenceLevel} (${confidenceScore}pt)${isPreferred ? ', Preferred (+10pt)' : ''}, Fairness (${fairnessScore}pt)`;

    ranked.push({
      driverProfileId: candidate.driverProfileId,
      displayName: candidate.displayName,
      latitude: candidate.latitude,
      longitude: candidate.longitude,
      score: totalScore,
      factors,
      explanation,
    });
  }

  // Sort descending by total score
  ranked.sort((a, b) => b.score - a.score);

  return ranked;
}
