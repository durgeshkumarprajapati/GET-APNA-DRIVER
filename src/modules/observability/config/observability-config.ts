export const HEALTH_COMPONENT_WEIGHTS = {
  app_availability: 0.15,
  database: 0.15,
  redis: 0.1,
  worker_outbox: 0.1,
  dispatch: 0.15,
  booking: 0.1,
  payment: 0.1,
  notification_location: 0.1,
  scheduled_trip_reliability: 0.05,
} as const;

export const TELEMETRY_CONFIG = {
  snapshotIntervalMs: 60_000, // 1 min snapshot frequency
  metricsTtlDays: 30,
  alertsTtlDays: 90,
  healthSnapshotsTtlDays: 14,
  slowQueryThresholdMs: 250,
  highMemoryPercentThreshold: 85,
  outboxPendingLagThresholdCount: 100,
  outboxOldestPendingThresholdSeconds: 120,
} as const;
