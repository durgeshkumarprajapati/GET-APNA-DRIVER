import 'server-only';
import { OperationalMetricsRepository } from '@/modules/observability/repositories/operational-metrics-repository';
import type { RouteProviderType } from '../domain/eta-types';

export interface LocationTelemetryStats {
  etaRequestCount: number;
  etaSuccessCount: number;
  etaFailureCount: number;
  providerCounts: Record<RouteProviderType, number>;
  staleCount: number;
  anomalyCount: number;
}

const stats: LocationTelemetryStats = {
  etaRequestCount: 0,
  etaSuccessCount: 0,
  etaFailureCount: 0,
  providerCounts: {
    GOOGLE: 0,
    MAPBOX: 0,
    DETERMINISTIC_FALLBACK: 0,
  },
  staleCount: 0,
  anomalyCount: 0,
};

export function recordETARequest(
  provider: RouteProviderType,
  isSuccess: boolean,
  latencyMs: number,
) {
  stats.etaRequestCount++;
  if (isSuccess) {
    stats.etaSuccessCount++;
    stats.providerCounts[provider] = (stats.providerCounts[provider] || 0) + 1;
  } else {
    stats.etaFailureCount++;
  }

  void OperationalMetricsRepository.recordMetric({
    metricName: 'location_intelligence.eta_request',
    dimension: provider,
    durationMs: latencyMs,
    isError: !isSuccess,
  }).catch(() => {});
}

export function recordLocationFreshnessMetric(status: 'LIVE' | 'RECENT' | 'STALE' | 'UNAVAILABLE') {
  if (status === 'STALE') stats.staleCount++;
  void OperationalMetricsRepository.recordMetric({
    metricName: 'location_intelligence.freshness',
    dimension: status,
    durationMs: 0,
    isError: status === 'STALE' || status === 'UNAVAILABLE',
  }).catch(() => {});
}

export function recordLocationAnomalyMetric(type: string) {
  stats.anomalyCount++;
  void OperationalMetricsRepository.recordMetric({
    metricName: 'location_intelligence.anomaly',
    dimension: type,
    durationMs: 0,
    isError: true,
  }).catch(() => {});
}

export function getLocationTelemetryStats(): LocationTelemetryStats {
  return { ...stats };
}
