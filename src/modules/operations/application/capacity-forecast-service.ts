import 'server-only';
import { prisma, type Db } from '@/shared/database/prisma';
import {
  defaultForecastProvider,
  type ForecastHorizon,
  type ForecastConfidence,
} from '@/modules/marketplace-intelligence/domain/forecast-service';
import { listMarketplaceZones } from '@/modules/marketplace-intelligence/domain/zone-service';

export type CapacityStatus = 'SURPLUS' | 'BALANCED' | 'SHORTAGE' | 'CRITICAL_SHORTAGE';

export interface CapacityZoneForecast {
  zoneId?: string;
  zoneName: string;
  zoneCode: string;
  forecastedDemand: number;
  expectedEligibleSupply: number;
  capacityGap: number;
  gapRatio: number;
  status: CapacityStatus;
  confidence: ForecastConfidence;
  explanation: string;
}

export interface CapacityForecastSummary {
  horizon: ForecastHorizon;
  evaluatedAt: Date;
  overall: CapacityZoneForecast;
  zones: CapacityZoneForecast[];
  worstZone: CapacityZoneForecast | null;
}

/**
 * gapRatio = (forecastedDemand - expectedEligibleSupply) / expectedEligibleSupply.
 * A positive ratio means demand is forecast to exceed supply; a negative one
 * means supply comfortably covers demand. Thresholds are deliberately
 * conservative (require a real, sizeable imbalance) so this doesn't fire on
 * routine noise in low-volume zones.
 */
function classifyGapRatio(gapRatio: number): CapacityStatus {
  if (gapRatio >= 1) return 'CRITICAL_SHORTAGE';
  if (gapRatio >= 0.3) return 'SHORTAGE';
  if (gapRatio <= -0.3) return 'SURPLUS';
  return 'BALANCED';
}

async function buildZoneForecast(
  horizon: ForecastHorizon,
  zoneId: string | undefined,
  zoneName: string,
  zoneCode: string,
): Promise<CapacityZoneForecast> {
  const forecast = await defaultForecastProvider.generateForecast(horizon, zoneId);
  const gap = forecast.forecastedDemand - forecast.expectedEligibleSupply;
  const gapRatio = Number((gap / Math.max(1, forecast.expectedEligibleSupply)).toFixed(2));

  return {
    zoneId,
    zoneName,
    zoneCode,
    forecastedDemand: forecast.forecastedDemand,
    expectedEligibleSupply: forecast.expectedEligibleSupply,
    capacityGap: gap,
    gapRatio,
    status: classifyGapRatio(gapRatio),
    confidence: forecast.confidence,
    explanation: forecast.explanation,
  };
}

const STATUS_RANK: Record<CapacityStatus, number> = {
  SURPLUS: 0,
  BALANCED: 1,
  SHORTAGE: 2,
  CRITICAL_SHORTAGE: 3,
};

/**
 * Composes the existing per-zone demand-forecast provider (marketplace-
 * intelligence, previously broken for zone/vehicle-category filtering — see
 * forecast-service.ts) with the existing supply service into a single
 * capacity-gap-per-zone view. This is deliberately a thin read-side
 * aggregation, mirroring reliability-intelligence-service.ts's shape
 * (stateless, `db` unused directly since both underlying services default to
 * the shared prisma client — kept for signature consistency with the rest
 * of this module) — no new forecasting logic, no persisted state.
 */
export async function getCapacityForecastSummary(
  horizon: ForecastHorizon = '1h',
  _db: Db = prisma,
): Promise<CapacityForecastSummary> {
  const zones = await listMarketplaceZones();
  const activeZones = zones.filter((z) => z.status === 'ACTIVE');

  const [overall, zoneForecasts] = await Promise.all([
    buildZoneForecast(horizon, undefined, 'All Zones (Platform-wide)', 'PLATFORM'),
    Promise.all(activeZones.map((z) => buildZoneForecast(horizon, z.id, z.name, z.code))),
  ]);

  const worstZone = zoneForecasts.reduce<CapacityZoneForecast | null>((worst, z) => {
    if (!worst || STATUS_RANK[z.status] > STATUS_RANK[worst.status]) return z;
    return worst;
  }, null);

  return {
    horizon,
    evaluatedAt: new Date(),
    overall,
    zones: zoneForecasts,
    worstZone,
  };
}
