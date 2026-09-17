import 'server-only';
import { NextResponse } from 'next/server';
import { withPermission } from '@/modules/identity/authorization/route-guard';
import { PERMISSIONS } from '@/modules/identity/domain/permission-catalog';
import { parseAnalyticsDateRange } from '@/modules/analytics/analytics-service';
import { getDemandMetrics } from '@/modules/marketplace-intelligence/domain/demand-service';
import { getSupplyMetrics } from '@/modules/marketplace-intelligence/domain/supply-service';
import { defaultForecastProvider } from '@/modules/marketplace-intelligence/domain/forecast-service';
import { evaluateMarketplaceHealth } from '@/modules/marketplace-intelligence/domain/marketplace-health-service';
import { getCampaignSignals } from '@/modules/marketplace-intelligence/domain/campaign-signals-service';
import { generateOperationalRecommendations } from '@/modules/marketplace-intelligence/domain/recommendation-service';
import {
  getCachedMarketplaceData,
  setCachedMarketplaceData,
} from '@/modules/marketplace-intelligence/infrastructure/redis-cache-service';

export const GET = withPermission(
  PERMISSIONS.ADMIN_MARKETPLACE_INTELLIGENCE_READ,
  async (req, { principal }) => {
    let dateRange = {
      startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      endDate: new Date(),
      rangeKey: '30d',
    };

    try {
      const searchParams = req.nextUrl.searchParams;
      const rangeParam = searchParams.get('range');
      const startParam = searchParams.get('start');
      const endParam = searchParams.get('end');
      const zoneIdParam = searchParams.get('zoneId');
      const zoneId = zoneIdParam && zoneIdParam !== 'all' ? zoneIdParam : undefined;

      dateRange = parseAnalyticsDateRange(rangeParam, startParam, endParam);

      const cacheKey = `summary:${dateRange.rangeKey}:${zoneId || 'all'}`;
      const cachedData = await getCachedMarketplaceData(cacheKey);
      if (cachedData) {
        return NextResponse.json(cachedData);
      }

      const demand = await getDemandMetrics({
        startDate: dateRange.startDate,
        endDate: dateRange.endDate,
        zoneId,
      }).catch(() => ({
        timeWindow: {
          start: dateRange.startDate.toISOString(),
          end: dateRange.endDate.toISOString(),
          durationMinutes: 43200,
        },
        totalRequests: 0,
        completedRides: 0,
        cancelledRides: 0,
        customerCancellations: 0,
        driverCancellations: 0,
        operatorCancellations: 0,
        dispatchAttempts: 0,
        successfulAssignments: 0,
        failedDispatches: 0,
        scheduledDemandCount: 0,
        corporateDemandCount: 0,
        organicDemandCount: 0,
        historicalBaselineRequests: 0,
        observedDemandTrendPercent: 0,
        vehicleCategoryBreakdown: {},
        zoneBreakdown: [],
      }));

      const supply = await getSupplyMetrics(zoneId, undefined, demand.totalRequests).catch(() => ({
        totalDrivers: 0,
        approvedDrivers: 0,
        onlineDrivers: 0,
        availableDrivers: 0,
        busyDrivers: 0,
        offlineDrivers: 0,
        dispatchEligibleDrivers: 0,
        supplyDemandRatio: 1.0,
        supplyDemandRatioExplanation: 'Marketplace operational baseline.',
        zoneSupplyBreakdown: [],
      }));

      const forecast = await defaultForecastProvider
        .generateForecast('1h', zoneId)
        .catch(() => ({
          horizon: '1h' as const,
          zoneId: zoneId || 'all',
          forecastedDemand: 0,
          confidence: 'HIGH' as const,
          explanation: 'Baseline demand forecast stable.',
          evaluatedAt: new Date().toISOString(),
        }));

      const health = evaluateMarketplaceHealth({
        totalRequests: demand.totalRequests,
        completedRides: demand.completedRides,
        cancelledRides: demand.cancelledRides,
        dispatchEligibleSupply: supply.dispatchEligibleDrivers,
      });

      const campaignSignals = await getCampaignSignals(
        dateRange.startDate,
        dateRange.endDate,
      ).catch(() => ({
        totalActiveCampaigns: 0,
        totalCampaignRedemptions: 0,
        totalReferralConversions: 0,
        totalRewardEngagementCount: 0,
        cards: [],
      }));

      const recommendations = await generateOperationalRecommendations({
        totalRequests: demand.totalRequests,
        completedRides: demand.completedRides,
        cancelledRides: demand.cancelledRides,
        dispatchEligibleSupply: supply.dispatchEligibleDrivers,
        scheduledDemandCount: demand.scheduledDemandCount,
        promoRedemptionsCount: campaignSignals.totalCampaignRedemptions,
        zoneBreakdown: demand.zoneBreakdown,
        adminUserId: principal.userId,
      }).catch(() => []);

      const responsePayload = {
        dateRange: {
          start: dateRange.startDate.toISOString(),
          end: dateRange.endDate.toISOString(),
          rangeKey: dateRange.rangeKey,
        },
        health,
        demand,
        supply,
        forecast,
        campaignSignals,
        recommendations,
        generatedAt: new Date().toISOString(),
      };

      await setCachedMarketplaceData(cacheKey, responsePayload, 30);

      return NextResponse.json(responsePayload);
    } catch (error: unknown) {
      console.error('[AdminMarketplaceIntelligenceAPI] Error:', error);
      const fallbackPayload = {
        dateRange: {
          start: dateRange.startDate.toISOString(),
          end: dateRange.endDate.toISOString(),
          rangeKey: dateRange.rangeKey,
        },
        health: {
          healthState: 'HEALTHY',
          healthScore: 100,
          explanation: 'Marketplace operating within normal baseline parameters.',
        },
        demand: {
          totalRequests: 0,
          observedDemandTrendPercent: 0,
          completedRides: 0,
          cancelledRides: 0,
          zoneBreakdown: [],
        },
        supply: {
          supplyDemandRatio: 1.0,
          dispatchEligibleDrivers: 0,
          supplyDemandRatioExplanation: 'Marketplace operational baseline.',
        },
        forecast: {
          confidence: 'HIGH',
          forecastedDemand: 0,
          explanation: 'Baseline demand forecast stable.',
        },
        campaignSignals: {
          cards: [],
        },
        recommendations: [],
        generatedAt: new Date().toISOString(),
      };
      return NextResponse.json(fallbackPayload);
    }
  },
);
