import { prisma, type Db } from '@/shared/database/prisma';
import type { PlatformAlert, AlertStatus } from '@prisma/client';
import type { AlertRule } from '../types/observability-types';
import { OperationalMetricsRepository } from '../repositories/operational-metrics-repository';

export const DEFAULT_ALERT_RULES: AlertRule[] = [
  {
    id: 'rule-high-api-error-rate',
    name: 'High API Error Rate',
    metricName: 'api.request',
    category: 'CORE',
    condition: 'ABOVE',
    threshold: 5.0, // > 5% error rate
    durationSeconds: 300,
    severity: 'CRITICAL',
    description: 'API error rate exceeded 5% over the past 5 minutes',
    remediationHint:
      'Check application server logs for unhandled exceptions or DB connectivity drops.',
  },
  {
    id: 'rule-slow-database',
    name: 'High Database Query Latency',
    metricName: 'db.query',
    category: 'STORAGE',
    condition: 'ABOVE',
    threshold: 250, // > 250ms
    durationSeconds: 300,
    severity: 'WARNING',
    description: 'Average database query latency exceeded 250ms',
    remediationHint: 'Inspect slow queries in Database Diagnostics HUD and check table indexes.',
  },
  {
    id: 'rule-outbox-lag',
    name: 'Outbox Event Processing Backlog',
    metricName: 'outbox.lag',
    category: 'WORKER',
    condition: 'ABOVE',
    threshold: 50, // > 50 pending events
    durationSeconds: 180,
    severity: 'WARNING',
    description: 'Outbox event queue pending count exceeded 50 items',
    remediationHint: 'Verify background outbox worker process is running and not deadlocked.',
  },
];

export class AlertEvaluationService {
  static async evaluateRules(
    rules: AlertRule[] = DEFAULT_ALERT_RULES,
    db: Db = prisma,
  ): Promise<PlatformAlert[]> {
    const evaluatedAlerts: PlatformAlert[] = [];
    const now = new Date();
    const fiveMinsAgo = new Date(now.getTime() - 5 * 60 * 1000);

    for (const rule of rules) {
      const fingerprint = `${rule.id}:${rule.metricName}`;
      const metrics = await OperationalMetricsRepository.getMetricAggregates(
        rule.metricName,
        fiveMinsAgo,
        now,
        'GLOBAL',
        db,
      );

      let currentValue = 0;
      if (rule.metricName === 'api.request') {
        currentValue = metrics.errorRatePercent;
      } else {
        currentValue = metrics.avgDurationMs;
      }

      const isFiring =
        rule.condition === 'ABOVE' ? currentValue > rule.threshold : currentValue < rule.threshold;

      const newStatus: AlertStatus = isFiring ? 'FIRING' : 'OK';

      const alert = await db.platformAlert.upsert({
        where: { fingerprint },
        create: {
          fingerprint,
          ruleName: rule.name,
          metricName: rule.metricName,
          component: rule.category,
          status: newStatus,
          severity: rule.severity,
          currentValue,
          thresholdValue: rule.threshold,
          summary: rule.description,
          firingAt: isFiring ? now : null,
          recoveredAt: isFiring ? null : now,
          lastEvaluatedAt: now,
        },
        update: {
          currentValue,
          status: newStatus,
          severity: rule.severity,
          firingAt: isFiring ? now : undefined,
          recoveredAt: isFiring ? undefined : now,
          lastEvaluatedAt: now,
        },
      });

      evaluatedAlerts.push(alert);
    }

    return evaluatedAlerts;
  }

  static async getActiveAlerts(db: Db = prisma): Promise<PlatformAlert[]> {
    return db.platformAlert.findMany({
      where: { status: 'FIRING' },
      orderBy: { createdAt: 'desc' },
    });
  }
}
