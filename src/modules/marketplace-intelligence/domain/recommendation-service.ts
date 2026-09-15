import 'server-only';
import { prisma } from '@/shared/database/prisma';
import { RecommendationActionType } from '@prisma/client';

export type RecommendationType =
  | 'SUPPLY_SHORTAGE'
  | 'SUPPLY_SURPLUS'
  | 'HIGH_CANCELLATION'
  | 'LOW_ACCEPTANCE'
  | 'DISPATCH_LATENCY'
  | 'SCHEDULED_DEMAND_SPIKE'
  | 'PROMOTION_DEMAND_SPIKE'
  | 'REFERRAL_ACTIVITY_SPIKE'
  | 'REWARD_ACTIVITY_SPIKE'
  | 'ZONE_RISK';

export type RecommendationSeverity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export interface OperationalRecommendation {
  id: string;
  fingerprint: string;
  type: RecommendationType;
  severity: RecommendationSeverity;
  zoneId?: string;
  zoneName?: string;
  timeWindow: string;
  reason: string;
  supportingMetrics: Record<string, unknown>;
  explanation: {
    what: string;
    where: string;
    when: string;
    why: string;
  };
  suggestedAction: string;
  createdAt: string;
  expiresAt: string;
}

export async function generateOperationalRecommendations(params: {
  totalRequests: number;
  completedRides: number;
  cancelledRides: number;
  dispatchEligibleSupply: number;
  scheduledDemandCount: number;
  promoRedemptionsCount?: number;
  zoneBreakdown?: Array<{
    zoneId: string;
    zoneName: string;
    zoneCode: string;
    requests: number;
    completed: number;
    cancelled: number;
    availableSupply?: number;
    eligibleSupply?: number;
  }>;
  adminUserId?: string;
}): Promise<OperationalRecommendation[]> {
  const {
    totalRequests,
    cancelledRides,
    dispatchEligibleSupply,
    scheduledDemandCount,
    zoneBreakdown = [],
  } = params;

  const now = new Date();
  const expiresAt = new Date(now.getTime() + 60 * 60 * 1000); // Valid for 1 hour
  const timeWindowStr = `${now.getHours()}:00 - ${now.getHours() + 1}:00`;

  // Fetch dismissed fingerprints
  const dismissedActions = await prisma.marketplaceRecommendationAction.findMany({
    where: { action: RecommendationActionType.DISMISSED },
    select: { recommendationFingerprint: true },
  });
  const dismissedSet = new Set(dismissedActions.map((a) => a.recommendationFingerprint));

  const recommendations: OperationalRecommendation[] = [];

  // 1. Check Global Supply Shortage
  if (totalRequests > 0 && dispatchEligibleSupply < totalRequests) {
    const fingerprint = `SUPPLY_SHORTAGE_GLOBAL_${now.toISOString().slice(0, 13)}`;
    if (!dismissedSet.has(fingerprint)) {
      recommendations.push({
        id: `rec-supply-shortage-${now.getTime()}`,
        fingerprint,
        type: 'SUPPLY_SHORTAGE',
        severity: dispatchEligibleSupply < totalRequests * 0.5 ? 'CRITICAL' : 'HIGH',
        timeWindow: timeWindowStr,
        reason: 'Current active demand exceeds available dispatch-eligible driver supply across the platform.',
        supportingMetrics: {
          currentRequests: totalRequests,
          eligibleSupply: dispatchEligibleSupply,
          ratio: Number((dispatchEligibleSupply / Math.max(1, totalRequests)).toFixed(2)),
        },
        explanation: {
          what: 'Supply Shortage Detected',
          where: 'All Urban Zones (Platform-wide)',
          when: timeWindowStr,
          why: `Expected demand of ${totalRequests} rides exceeds current available eligible supply of ${dispatchEligibleSupply} drivers.`,
        },
        suggestedAction: 'Consider alerting off-shift drivers or reviewing incentive broadcasts in high-demand zones.',
        createdAt: now.toISOString(),
        expiresAt: expiresAt.toISOString(),
      });
    }
  }

  // 2. Check High Cancellation Rate
  const cancellationRate = totalRequests > 0 ? (cancelledRides / totalRequests) * 100 : 0;
  if (totalRequests >= 3 && cancellationRate >= 15) {
    const fingerprint = `HIGH_CANCELLATION_GLOBAL_${now.toISOString().slice(0, 13)}`;
    if (!dismissedSet.has(fingerprint)) {
      recommendations.push({
        id: `rec-high-cancellation-${now.getTime()}`,
        fingerprint,
        type: 'HIGH_CANCELLATION',
        severity: cancellationRate >= 25 ? 'CRITICAL' : 'MEDIUM',
        timeWindow: timeWindowStr,
        reason: 'Observed cancellation rate exceeds operational baseline threshold of 15%.',
        supportingMetrics: {
          cancellationRatePercent: Number(cancellationRate.toFixed(1)),
          totalCancelled: cancelledRides,
          totalRequests,
        },
        explanation: {
          what: 'Elevated Ride Cancellation Rate',
          where: 'Platform-wide',
          when: timeWindowStr,
          why: `${cancelledRides} of ${totalRequests} ride requests (${cancellationRate.toFixed(1)}%) were cancelled in the current window.`,
        },
        suggestedAction: 'Investigate dispatch match latency, pickup ETA accuracy, or driver cancellation reasons.',
        createdAt: now.toISOString(),
        expiresAt: expiresAt.toISOString(),
      });
    }
  }

  // 3. Check Scheduled Demand Spike
  if (scheduledDemandCount >= 5) {
    const fingerprint = `SCHEDULED_SPIKE_${now.toISOString().slice(0, 13)}`;
    if (!dismissedSet.has(fingerprint)) {
      recommendations.push({
        id: `rec-scheduled-spike-${now.getTime()}`,
        fingerprint,
        type: 'SCHEDULED_DEMAND_SPIKE',
        severity: 'MEDIUM',
        timeWindow: timeWindowStr,
        reason: 'Significant volume of pre-scheduled rides scheduled for dispatch in upcoming time window.',
        supportingMetrics: {
          scheduledDemandCount,
        },
        explanation: {
          what: 'Upcoming Scheduled Demand Spike',
          where: 'Multiple Designated Pickup Hubs',
          when: timeWindowStr,
          why: `${scheduledDemandCount} advance scheduled rides are queuing for dispatch matching in the next 60 minutes.`,
        },
        suggestedAction: 'Ensure favorite drivers and high-tier drivers are online and pre-allocated to scheduled occurrences.',
        createdAt: now.toISOString(),
        expiresAt: expiresAt.toISOString(),
      });
    }
  }

  // 4. Check Zone-Level Risks
  for (const z of zoneBreakdown) {
    if (z.requests >= 2 && z.cancelled > 0) {
      const zoneCancelRate = (z.cancelled / z.requests) * 100;
      if (zoneCancelRate >= 20) {
        const fingerprint = `ZONE_RISK_${z.zoneId}_${now.toISOString().slice(0, 13)}`;
        if (!dismissedSet.has(fingerprint)) {
          recommendations.push({
            id: `rec-zone-risk-${z.zoneId}-${now.getTime()}`,
            fingerprint,
            type: 'ZONE_RISK',
            severity: 'HIGH',
            zoneId: z.zoneId,
            zoneName: z.zoneName,
            timeWindow: timeWindowStr,
            reason: `Zone ${z.zoneName} experiencing elevated cancellations (${zoneCancelRate.toFixed(1)}%).`,
            supportingMetrics: {
              zoneId: z.zoneId,
              zoneName: z.zoneName,
              zoneRequests: z.requests,
              zoneCancelled: z.cancelled,
              zoneCancelRatePercent: Number(zoneCancelRate.toFixed(1)),
            },
            explanation: {
              what: 'Zone Operational Risk',
              where: z.zoneName,
              when: timeWindowStr,
              why: `${z.cancelled} out of ${z.requests} requests in ${z.zoneName} were cancelled.`,
            },
            suggestedAction: 'Deploy additional driver supply or check local traffic/dispatch latency in this zone.',
            createdAt: now.toISOString(),
            expiresAt: expiresAt.toISOString(),
          });
        }
      }
    }
  }

  return recommendations;
}

export async function recordRecommendationAction(params: {
  recommendationFingerprint: string;
  action: RecommendationActionType;
  adminUserId: string;
  notes?: string;
}) {
  return prisma.marketplaceRecommendationAction.create({
    data: {
      recommendationFingerprint: params.recommendationFingerprint,
      action: params.action,
      adminUserId: params.adminUserId,
      notes: params.notes,
    },
  });
}
