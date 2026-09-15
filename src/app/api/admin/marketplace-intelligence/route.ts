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
    try {
      const searchParams = req.nextUrl.searchParams;
      const rangeParam = searchParams.get('range');
      const startParam = searchParams.get('start');
      const endParam = searchParams.get('end');
      const zoneId = searchParams.get('zoneId') || undefined;

      const dateRange = parseAnalyticsDateRange(rangeParam, startParam, endParam);

      const cacheKey = `summary:${dateRange.rangeKey}:${zoneId || 'all'}`;
      const cachedData = await getCachedMarketplaceData(cacheKey);
      if (cachedData) {
        return NextResponse.json(cachedData);
      }

      const demand = await getDemandMetrics({
        startDate: dateRange.startDate,
        endDate: dateRange.endDate,
        zoneId,
      });

      const supply = await getSupplyMetrics(zoneId, undefined, demand.totalRequests);

      const forecast = await defaultForecastProvider.generateForecast('1h', zoneId);

      const health = evaluateMarketplaceHealth({
        totalRequests: demand.totalRequests,
        completedRides: demand.completedRides,
        cancelledRides: demand.cancelledRides,
        dispatchEligibleSupply: supply.dispatchEligibleDrivers,
      });

      const campaignSignals = await getCampaignSignals(dateRange.startDate, dateRange.endDate);

      const recommendations = await generateOperationalRecommendations({
        totalRequests: demand.totalRequests,
        completedRides: demand.completedRides,
        cancelledRides: demand.cancelledRides,
        dispatchEligibleSupply: supply.dispatchEligibleDrivers,
        scheduledDemandCount: demand.scheduledDemandCount,
        promoRedemptionsCount: campaignSignals.totalCampaignRedemptions,
        zoneBreakdown: demand.zoneBreakdown,
        adminUserId: principal.userId,
      });

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
      return NextResponse.json(
        { error: (error as Error).message || 'Internal Server Error' },
        { status: 500 },
      );
    }
  },
);
