import 'server-only';
import { prisma, type Db } from '@/shared/database/prisma';
import { getSupplyMetrics } from '@/modules/marketplace-intelligence/domain/supply-service';
import { calculatePressureFromSignals } from '../domain/pricing-pressure-policy';
import type { PressureEvaluationResult } from '../domain/pricing-pressure-types';

/**
 * Service evaluating real-time marketplace pressure state for a given zone and demand context.
 * Integrates directly with Marketplace Intelligence supply metrics.
 */
export async function getMarketplacePressure(
  zoneId?: string | null,
  simulatedDemandOverride?: number,
  _db: Db = prisma,
): Promise<PressureEvaluationResult> {
  // Count active searching/in-progress bookings in the last 15 minutes as real demand
  const fifteenMinsAgo = new Date(Date.now() - 15 * 60 * 1000);
  const activeDemandCount =
    typeof simulatedDemandOverride === 'number'
      ? simulatedDemandOverride
      : (_db.booking?.count
          ? await _db.booking
              .count({
                where: {
                  requestedAt: { gte: fifteenMinsAgo },
                  status: {
                    in: [
                      'SEARCHING_DRIVER',
                      'DRIVER_ASSIGNED',
                      'DRIVER_EN_ROUTE',
                      'TRIP_IN_PROGRESS',
                    ],
                  },
                },
              })
              .catch(() => 1)
          : 1) || 1;

  const supplyMetrics = await getSupplyMetrics(zoneId ?? undefined, undefined, activeDemandCount);

  // Compute overall health score: 100 baseline, degraded by low supply ratio
  const ratio = supplyMetrics.supplyDemandRatio;
  let healthScore = 100;
  if (ratio < 0.5) healthScore = 30;
  else if (ratio < 0.8) healthScore = 55;
  else if (ratio < 1.0) healthScore = 75;

  return calculatePressureFromSignals({
    supplyDemandRatio: ratio,
    healthScore,
    demandTrendPercent: 0,
    expectedEligibleSupply: supplyMetrics.dispatchEligibleDrivers,
    forecastedDemand: activeDemandCount,
  });
}
