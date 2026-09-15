import type { PlatformHealthStatus, AlertSeverity, AlertStatus } from '@prisma/client';

export type { PlatformHealthStatus, AlertSeverity, AlertStatus };

export interface HealthComponentScore {
  name: string;
  category: 'CORE' | 'STORAGE' | 'WORKER' | 'DOMAIN' | 'DEPENDENCY';
  status: PlatformHealthStatus;
  score: number; // 0 to 100
  weight: number; // weight in overall platform score (0-1)
  latencyMs?: number;
  errorRatePercent?: number;
  details?: Record<string, unknown>;
}

export interface PlatformHealthSummary {
  overallStatus: PlatformHealthStatus;
  overallScore: number; // 0 to 100
  timestamp: string; // ISO string
  components: Record<string, HealthComponentScore>;
  activeAlertCount: number;
  criticalAlertCount: number;
  version: string;
}

export interface MetricPoint {
  timestamp: string;
  metricName: string;
  category: string;
  value: number;
  sampleCount: number;
  metadata?: Record<string, unknown>;
}

export interface MetricAggregationWindow {
  window: '1m' | '5m' | '15m' | '1h' | '24h';
  startTime: string;
  endTime: string;
  metrics: Record<string, {
    count: number;
    avg: number;
    p95: number;
    p99: number;
    min: number;
    max: number;
    errorRate: number;
  }>;
}

export interface AlertRule {
  id: string;
  name: string;
  metricName: string;
  category: string;
  condition: 'ABOVE' | 'BELOW' | 'EQUALS' | 'NOT_EQUALS';
  threshold: number;
  durationSeconds: number;
  severity: AlertSeverity;
  description: string;
  remediationHint?: string;
}

export interface PlatformAlertDto {
  id: string;
  alertName: string;
  severity: AlertSeverity;
  status: AlertStatus;
  category: string;
  component: string;
  description: string;
  value: number;
  threshold: number;
  firedAt: string;
  acknowledgedAt?: string;
  acknowledgedBy?: string;
  resolvedAt?: string;
  metadata?: Record<string, unknown>;
}

export interface DatabaseDiagnosticsReport {
  timestamp: string;
  status: PlatformHealthStatus;
  latencyMs: number;
  activeConnections?: number;
  idleConnections?: number;
  maxConnections?: number;
  slowQueryCount: number;
  tableStats: Array<{
    tableName: string;
    rowCountEstimate: number;
    indexHitsPercent: number;
  }>;
  migrationsUpToDate: boolean;
  notes: string[];
}

export interface RedisDiagnosticsReport {
  timestamp: string;
  status: PlatformHealthStatus;
  latencyMs: number;
  connectedClients: number;
  usedMemoryHuman: string;
  usedMemoryBytes: number;
  maxMemoryBytes: number;
  memoryUsagePercent: number;
  hitRatePercent: number;
  uptimeDays: number;
  notes: string[];
}

export interface WorkerDiagnosticsReport {
  timestamp: string;
  status: PlatformHealthStatus;
  outboxStats: {
    pendingCount: number;
    processingCount: number;
    failedCount: number;
    completed24hCount: number;
    oldestPendingAgeSeconds: number;
  };
  queueStats: Array<{
    queueName: string;
    waitingCount: number;
    activeCount: number;
    failedCount: number;
  }>;
  notes: string[];
}

export interface ServiceSloReport {
  serviceName: string;
  sliName: string;
  targetPercent: number; // e.g. 99.9%
  actualPercent: number; // e.g. 99.85%
  isCompliant: boolean;
  errorBudgetRemainingPercent: number;
  timeframe: string;
}

export interface IncidentCorrelationReport {
  incidentId: string;
  detectedAt: string;
  primaryAlert: PlatformAlertDto;
  correlatedAlerts: PlatformAlertDto[];
  suspectedRootCauses: Array<{
    component: string;
    reason: string;
    confidence: number; // 0 to 1
  }>;
  impactedServices: string[];
  recommendedActions: string[];
}
