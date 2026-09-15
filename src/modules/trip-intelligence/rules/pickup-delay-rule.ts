import type { LocationFreshness } from '../trip-intelligence-types';
import { getTripIntelligenceConfig } from '../trip-intelligence-config';

export interface DelayRuleInput {
  status: string;
  driverEnRouteAt?: Date | string | null;
  freshness: LocationFreshness;
  freshnessSeconds: number;
}

export function evaluatePickupDelayRisk(input: DelayRuleInput): boolean {
  if (input.status !== 'DRIVER_EN_ROUTE' && input.status !== 'DRIVER_ASSIGNED') {
    return false;
  }

  const config = getTripIntelligenceConfig();

  if (input.freshness === 'STALE' || input.freshness === 'UNAVAILABLE') {
    return true;
  }

  if (input.driverEnRouteAt) {
    const enRouteTime = typeof input.driverEnRouteAt === 'string' ? new Date(input.driverEnRouteAt).getTime() : input.driverEnRouteAt.getTime();
    const elapsedSeconds = (Date.now() - enRouteTime) / 1000;
    if (elapsedSeconds > config.delayThresholdSeconds) {
      return true;
    }
  }

  return false;
}
