import 'server-only';
import { prisma, type Db } from '@/shared/database/prisma';
import {
  MarketplaceExpansionReportDTO,
  CityExpansionScoreDTO,
} from '../../domain/marketplace-expansion-types';
import { calculateHaversineDistance } from '../distance-service';

function demandLevelFor(count: number): CityExpansionScoreDTO['demandLevel'] {
  if (count >= 50) return 'VERY_HIGH';
  if (count >= 20) return 'HIGH';
  if (count >= 5) return 'MEDIUM';
  return 'LOW';
}

function supplyLevelFor(ratio: number): CityExpansionScoreDTO['driverSupplyLevel'] {
  if (ratio >= 0.8) return 'HIGH';
  if (ratio >= 0.3) return 'BALANCED';
  return 'LOW';
}

function opportunityRatingFor(
  demandLevel: CityExpansionScoreDTO['demandLevel'],
  supplyLevel: CityExpansionScoreDTO['driverSupplyLevel'],
): CityExpansionScoreDTO['opportunityRating'] {
  const demandScore = { LOW: 0, MEDIUM: 1, HIGH: 2, VERY_HIGH: 3 }[demandLevel];
  const supplyGapScore = { HIGH: 0, BALANCED: 1, LOW: 2 }[supplyLevel];
  const total = demandScore + supplyGapScore;
  if (total >= 4) return 'VERY_HIGH';
  if (total >= 3) return 'HIGH';
  if (total >= 1) return 'MODERATE';
  return 'LOW';
}

function recommendedActionFor(
  demandLevel: CityExpansionScoreDTO['demandLevel'],
  supplyLevel: CityExpansionScoreDTO['driverSupplyLevel'],
): string {
  if (supplyLevel === 'LOW' && (demandLevel === 'HIGH' || demandLevel === 'VERY_HIGH')) {
    return 'Launch driver recruitment campaign — demand is outpacing available supply.';
  }
  if (supplyLevel === 'HIGH' && (demandLevel === 'LOW' || demandLevel === 'MEDIUM')) {
    return 'Focus on demand generation — driver supply already exceeds current bookings.';
  }
  return 'Monitor demand and supply trends before committing further investment.';
}

/**
 * Phase 111 — Marketplace Expansion Intelligence Service
 * Evaluates demand vs. driver supply for each configured marketplace zone
 * to answer: "Where should we expand next?"
 *
 * A prior version invented three specific cities (Vadodara/Pune/Surat) with
 * specific fabricated demand/supply/conversion numbers and recommendations
 * — none of which exist anywhere in this schema (bookings and zones are
 * modeled by coordinates/radius, not city names), and no database query was
 * ever made. There's no real data source for "which NEW city to expand
 * into" (that would need external market/population data this platform
 * doesn't have) — what IS real and computable is demand/supply health for
 * the zones already configured in MarketplaceZone, which this now reports
 * honestly instead.
 */
export async function getMarketplaceExpansionReport(
  db: Db = prisma,
): Promise<MarketplaceExpansionReportDTO> {
  const zones = await db.marketplaceZone.findMany();

  if (zones.length === 0) {
    return {
      citiesEvaluated: [],
      demandHeatmapHotspots: [],
      capacityPlanningNotes: 'No marketplace zones are configured yet.',
    };
  }

  const recentWindowStart = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);

  const [availableDrivers, openBookings, recentBookings] = await Promise.all([
    db.driverProfile.findMany({
      where: { availabilityStatus: 'AVAILABLE', approvalStatus: 'APPROVED' },
      select: { currentLocation: { select: { latitude: true, longitude: true } } },
    }),
    db.booking.findMany({
      where: {
        status: { in: ['DRAFT', 'SEARCHING_DRIVER', 'DRIVER_ASSIGNED', 'TRIP_IN_PROGRESS'] },
      },
      select: { pickupLatitude: true, pickupLongitude: true },
    }),
    // Last 90 days only, to bound this to a reasonable query cost.
    db.booking.findMany({
      where: { createdAt: { gte: recentWindowStart } },
      select: { pickupLatitude: true, pickupLongitude: true, status: true },
    }),
  ]);

  const isWithinZoneRadius = (
    lat: number,
    lon: number,
    zone: { centerLatitude: number; centerLongitude: number; radiusMeters: number },
  ): boolean => {
    try {
      return (
        calculateHaversineDistance(lat, lon, zone.centerLatitude, zone.centerLongitude) <=
        zone.radiusMeters
      );
    } catch {
      return false;
    }
  };

  const citiesEvaluated: CityExpansionScoreDTO[] = zones.map((zone) => {
    const demandCount = openBookings.filter((b) =>
      isWithinZoneRadius(b.pickupLatitude, b.pickupLongitude, zone),
    ).length;
    const supplyCount = availableDrivers.filter(
      (d) =>
        d.currentLocation &&
        isWithinZoneRadius(d.currentLocation.latitude, d.currentLocation.longitude, zone),
    ).length;

    const demandLevel = demandLevelFor(demandCount);
    const supplyRatio = demandCount > 0 ? supplyCount / demandCount : supplyCount > 0 ? 1 : 0;
    const driverSupplyLevel = supplyLevelFor(supplyRatio);

    const zoneRecentBookings = recentBookings.filter((b) =>
      isWithinZoneRadius(b.pickupLatitude, b.pickupLongitude, zone),
    );
    const zoneCompletedBookings = zoneRecentBookings.filter(
      (b) => b.status === 'TRIP_COMPLETED',
    ).length;
    const conversionRatePercent =
      zoneRecentBookings.length > 0
        ? Number(((zoneCompletedBookings / zoneRecentBookings.length) * 100).toFixed(1))
        : 0;

    return {
      // This platform models service areas as zones (coordinates + radius),
      // not named cities — the zone's own name/code is the only real
      // geographic label available.
      cityName: zone.name,
      state: zone.code,
      demandLevel,
      driverSupplyLevel,
      conversionRatePercent,
      opportunityRating: opportunityRatingFor(demandLevel, driverSupplyLevel),
      recommendedAction: recommendedActionFor(demandLevel, driverSupplyLevel),
    };
  });

  const opportunityScore = { LOW: 0, MODERATE: 1, HIGH: 2, VERY_HIGH: 3 };
  const topExpansionCandidate = [...citiesEvaluated].sort(
    (a, b) => opportunityScore[b.opportunityRating] - opportunityScore[a.opportunityRating],
  )[0];

  const demandLevelIntensity: Record<CityExpansionScoreDTO['demandLevel'], number> = {
    LOW: 25,
    MEDIUM: 50,
    HIGH: 75,
    VERY_HIGH: 95,
  };
  const demandHeatmapHotspots = zones.map((zone, idx) => ({
    name: zone.name,
    lat: zone.centerLatitude,
    lng: zone.centerLongitude,
    intensityScore: demandLevelIntensity[citiesEvaluated[idx].demandLevel],
  }));

  return {
    citiesEvaluated,
    topExpansionCandidate,
    demandHeatmapHotspots,
    capacityPlanningNotes: topExpansionCandidate
      ? `${topExpansionCandidate.cityName} shows the highest opportunity rating among configured zones.`
      : 'No zone data available to evaluate expansion opportunities.',
  };
}
