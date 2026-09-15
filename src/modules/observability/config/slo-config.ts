export interface SloDefinition {
  id: string;
  serviceName: string;
  metricName: string;
  description: string;
  targetPercent: number; // e.g. 99.9
  warningThresholdPercent: number; // e.g. 99.5
  latencyTargetMs?: number;
  timeWindow: string; // '24h', '7d', '30d'
}

export const SLO_DEFINITIONS: SloDefinition[] = [
  {
    id: 'slo-api-availability',
    serviceName: 'API Gateway & Routes',
    metricName: 'api.availability',
    description: 'Percentage of non-5xx API responses over 24 hours',
    targetPercent: 99.9,
    warningThresholdPercent: 99.5,
    timeWindow: '24h',
  },
  {
    id: 'slo-api-latency-p95',
    serviceName: 'API Gateway & Routes',
    metricName: 'api.latency.p95',
    description: 'Percentage of API requests completing in <= 300ms',
    targetPercent: 95.0,
    warningThresholdPercent: 90.0,
    latencyTargetMs: 300,
    timeWindow: '24h',
  },
  {
    id: 'slo-booking-success',
    serviceName: 'Booking Engine',
    metricName: 'booking.success_rate',
    description: 'Percentage of non-system-failed booking attempts',
    targetPercent: 98.0,
    warningThresholdPercent: 95.0,
    timeWindow: '24h',
  },
  {
    id: 'slo-dispatch-matching-time',
    serviceName: 'Dispatch & Matching Engine',
    metricName: 'dispatch.match_latency.p95',
    description: 'Percentage of dispatch requests matched in <= 15000ms (15s)',
    targetPercent: 95.0,
    warningThresholdPercent: 90.0,
    latencyTargetMs: 15000,
    timeWindow: '24h',
  },
  {
    id: 'slo-payment-success',
    serviceName: 'Payment Engine',
    metricName: 'payment.success_rate',
    description: 'Percentage of clean payment transaction completions',
    targetPercent: 99.5,
    warningThresholdPercent: 98.5,
    timeWindow: '24h',
  },
  {
    id: 'slo-outbox-processing-lag',
    serviceName: 'Outbox Event Worker',
    metricName: 'outbox.processing_lag',
    description: 'Percentage of events processed within <= 10000ms (10s)',
    targetPercent: 99.0,
    warningThresholdPercent: 95.0,
    latencyTargetMs: 10000,
    timeWindow: '24h',
  },
];
