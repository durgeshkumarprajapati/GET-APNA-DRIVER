import 'server-only';
import { prisma, type Db } from '@/shared/database/prisma';
import { calculateHaversineDistance } from '@/modules/location/application/distance-service';
import { evaluateDriverEligibility } from '@/modules/driver/application/services/driver-eligibility-service';
import { defaultETAService } from '@/modules/location-intelligence/application/eta-service';
import { BookingStatus } from '@prisma/client';
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
  requestedVehicleCategory?: string | null;
  bookingType?: string | null;
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
  referenceTime: Date = new Date(),
): Promise<RankedCandidate[]> {
  const now = referenceTime;
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

  // 2. Sort by straight-line distance to select top N shortlist for ETA and signal enrichment
  eligibleCandidates.sort((a, b) => a.distanceKm - b.distanceKm);
  const shortlist = eligibleCandidates.slice(0, SHORTLIST_ETA_LIMIT);
  const driverProfileIds = shortlist.map((item) => item.candidate.driverProfileId);

  // 3. Batch Signals Enrichment (bounded queries to prevent N+1)
  const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  const [ratingSummaries, favoriteRecords, recentAssignments, tripStats] = await Promise.all([
    // Batch 1: Driver rating summaries
    db.driverRatingSummary?.findMany
      ? db.driverRatingSummary.findMany({
          where: { driverProfileId: { in: driverProfileIds } },
          select: { driverProfileId: true, averageRating: true, totalReviews: true },
        })
      : Promise.resolve([]),

    // Batch 2: Customer favorite drivers
    options.customerId && db.customerFavoriteDriver?.findMany
      ? db.customerFavoriteDriver.findMany({
          where: { customerId: options.customerId, driverProfileId: { in: driverProfileIds } },
          select: { driverProfileId: true },
        })
      : Promise.resolve([]),

    // Batch 3: Recent assignment offers (past 24h) for fairness calculation
    db.bookingAssignmentAttempt?.groupBy
      ? db.bookingAssignmentAttempt.groupBy({
          by: ['driverProfileId'],
          where: {
            driverProfileId: { in: driverProfileIds },
            offeredAt: { gte: twentyFourHoursAgo },
          },
          _count: { id: true },
        })
      : Promise.resolve([]),

    // Batch 4: Recent booking completions vs cancellations (past 7d) for reliability
    db.booking?.groupBy
      ? db.booking.groupBy({
          by: ['driverProfileId', 'status'],
          where: {
            driverProfileId: { in: driverProfileIds },
            createdAt: { gte: sevenDaysAgo },
            status: { in: [BookingStatus.TRIP_COMPLETED, BookingStatus.CANCELLED] },
          },
          _count: { _all: true },
        })
      : Promise.resolve([]),
  ]);

  // Map rating summaries
  const ratingMap = new Map<string, { averageRating: number; totalReviews: number }>();
  for (const r of ratingSummaries) {
    ratingMap.set(r.driverProfileId, {
      averageRating: Number(r.averageRating),
      totalReviews: r.totalReviews,
    });
  }

  // Set of favorite driver IDs for this customer
  const favoriteDriverSet = new Set(favoriteRecords.map((f) => f.driverProfileId));

  // Map assignment counts for fairness
  const assignmentCountMap = new Map<string, number>();
  for (const item of recentAssignments) {
    assignmentCountMap.set(item.driverProfileId, item._count.id);
  }

  // Map reliability (completion ratio)
  const reliabilityMap = new Map<string, { completed: number; cancelled: number }>();
  for (const stat of tripStats as Array<{ driverProfileId: string | null; status: BookingStatus; _count: { _all: number } }>) {
    if (!stat.driverProfileId) continue;
    const current = reliabilityMap.get(stat.driverProfileId) || { completed: 0, cancelled: 0 };
    const count = stat._count?._all ?? 0;
    if (stat.status === BookingStatus.TRIP_COMPLETED) {
      current.completed += count;
    } else if (stat.status === BookingStatus.CANCELLED) {
      current.cancelled += count;
    }
    reliabilityMap.set(stat.driverProfileId, current);
  }

  // 4. Calculate multi-factor score for each candidate in shortlist
  const ranked: RankedCandidate[] = [];

  for (const item of shortlist) {
    const { candidate, distanceKm, freshnessClass, confidenceLevel } = item;

    // Check preferred / favorite driver status
    const isExplicitlyPreferred = options.preferredDriverProfileId === candidate.driverProfileId;
    const isCustomerFavorite = favoriteDriverSet.has(candidate.driverProfileId);
    const isPreferred = isExplicitlyPreferred || isCustomerFavorite;

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

    const effectiveEta = etaMinutes ?? (distanceKm * 3 + 2);

    // Scoring components:
    // A. ETA score: max 30 pts (lower ETA = higher score)
    const etaScore = Math.max(0, 30 - effectiveEta * 2);

    // B. Distance score: max 15 pts (lower distance = higher score)
    const distanceScore = Math.max(0, 15 - distanceKm * 1.5);

    // C. Freshness score: LIVE = 15 pts, RECENT = 10 pts
    const freshnessScore = freshnessClass === 'LIVE' ? 15 : 10;

    // D. Confidence score: HIGH = 10 pts, MEDIUM = 7 pts, LOW = 4 pts
    const confidenceScore = confidenceLevel === 'HIGH' ? 10 : confidenceLevel === 'MEDIUM' ? 7 : 4;

    // E. Preferred / Favorite driver bonus: 25 pts (prioritizes customer preferred driver when eligible)
    const preferredBonusScore = isPreferred ? 25 : 0;

    // F. Rating score: max 10 pts
    const ratingInfo = ratingMap.get(candidate.driverProfileId);
    let ratingScore = 7; // Fair unrated default
    let averageRating: number | null = null;
    let totalReviews = 0;
    if (ratingInfo && ratingInfo.totalReviews > 0) {
      averageRating = ratingInfo.averageRating;
      totalReviews = ratingInfo.totalReviews;
      // Scale rating 1.0 - 5.0 to 2 - 10 pts
      ratingScore = Math.min(10, Math.max(2, Math.round(averageRating * 2)));
    }

    // G. Reliability score: max 10 pts based on recent completion vs cancellation ratio
    const relInfo = reliabilityMap.get(candidate.driverProfileId);
    let reliabilityScore = 8; // Default neutral reliability score
    if (relInfo && relInfo.completed + relInfo.cancelled > 0) {
      const ratio = relInfo.completed / (relInfo.completed + relInfo.cancelled);
      reliabilityScore = Math.round(ratio * 10);
    }

    // H. Fairness / Starvation prevention: max 10 pts for drivers with fewer recent offers
    const recentAssignmentCount = assignmentCountMap.get(candidate.driverProfileId) || 0;
    const fairnessScore = Math.max(0, 10 - recentAssignmentCount * 2);

    // I. Vehicle match score: max 10 pts
    let vehicleCategoryMatch = true;
    let vehicleMatchScore = 10;
    if (options.requestedVehicleCategory && candidate.vehicleCategory) {
      vehicleCategoryMatch =
        options.requestedVehicleCategory.toUpperCase() === candidate.vehicleCategory.toUpperCase();
      vehicleMatchScore = vehicleCategoryMatch ? 10 : 0;
    }

    const totalScore = Math.round(
      etaScore +
        distanceScore +
        freshnessScore +
        confidenceScore +
        preferredBonusScore +
        ratingScore +
        reliabilityScore +
        fairnessScore +
        vehicleMatchScore,
    );

    const scoreBreakdown = {
      etaScore: Math.round(etaScore),
      distanceScore: Math.round(distanceScore),
      freshnessScore,
      confidenceScore,
      preferredBonusScore,
      ratingScore,
      reliabilityScore,
      fairnessScore,
      vehicleMatchScore,
    };

    const factors: CandidateRankingFactors = {
      etaMinutes,
      distanceKm: Math.round(distanceKm * 100) / 100,
      freshnessClass,
      confidenceLevel,
      isPreferredDriver: isPreferred,
      isScheduleCompatible: true,
      recentAssignmentCount,
      riskRestriction: false,
      averageRating,
      totalReviews,
      ratingScore,
      reliabilityScore,
      vehicleCategoryMatch,
      vehicleMatchScore,
      fairnessScore: Math.round(fairnessScore),
      etaScore: Math.round(etaScore),
      distanceScore: Math.round(distanceScore),
      freshnessScore,
      confidenceScore,
      preferredBonusScore,
    };

    const explanation = `Score ${totalScore}: ETA ${etaMinutes ?? 'N/A'}m (${scoreBreakdown.etaScore}pt), Dist ${factors.distanceKm}km (${scoreBreakdown.distanceScore}pt), Freshness ${freshnessClass} (${freshnessScore}pt), Confidence ${confidenceLevel} (${confidenceScore}pt)${isPreferred ? ', Preferred (+25pt)' : ''}, Rating ${averageRating ? `${averageRating}⭐` : 'Unrated'} (${ratingScore}pt), Reliability (${reliabilityScore}pt), Fairness (${fairnessScore}pt), Vehicle (${vehicleMatchScore}pt)`;

    ranked.push({
      driverProfileId: candidate.driverProfileId,
      displayName: candidate.displayName,
      latitude: candidate.latitude,
      longitude: candidate.longitude,
      score: totalScore,
      factors,
      scoreBreakdown,
      explanation,
    });
  }

  // Sort descending by total score
  ranked.sort((a, b) => b.score - a.score);

  return ranked;
}
