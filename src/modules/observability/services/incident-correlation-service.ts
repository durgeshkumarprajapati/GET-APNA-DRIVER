import { prisma, type Db } from '@/shared/database/prisma';
import type { IncidentCorrelationReport, PlatformAlertDto } from '../types/observability-types';
import { AlertEvaluationService } from './alert-evaluation-service';
import { PlatformHealthService } from '../health/platform-health-service';

export class IncidentCorrelationService {
  static async correlateIncidents(db: Db = prisma): Promise<IncidentCorrelationReport | null> {
    const activeAlerts = await AlertEvaluationService.getActiveAlerts(db);
    if (activeAlerts.length === 0) {
      return null;
    }

    const platformHealth = await PlatformHealthService.evaluatePlatformHealth(db, false);

    const mappedAlerts: PlatformAlertDto[] = activeAlerts.map((a) => ({
      id: a.id,
      alertName: a.ruleName,
      severity: a.severity,
      status: a.status,
      category: a.component,
      component: a.component,
      description: a.summary,
      value: a.currentValue,
      threshold: a.thresholdValue,
      firedAt: a.firingAt ? a.firingAt.toISOString() : a.createdAt.toISOString(),
    }));

    const primaryAlert = mappedAlerts[0];
    const correlatedAlerts = mappedAlerts.slice(1);

    const suspectedRootCauses: IncidentCorrelationReport['suspectedRootCauses'] = [];
    const impactedServices: string[] = [];
    const recommendedActions: string[] = [];

    if (platformHealth.components.database.status !== 'HEALTHY') {
      suspectedRootCauses.push({
        component: 'Database',
        reason: 'Database query latency or connectivity degraded',
        confidence: 0.9,
      });
      impactedServices.push('Booking Engine', 'Payment Engine', 'API Gateway');
      recommendedActions.push('Check Database Diagnostics HUD', 'Verify connection pool sizes and active PostgreSQL processes');
    }

    if (platformHealth.components.redis.status !== 'HEALTHY') {
      suspectedRootCauses.push({
        component: 'Redis Cache & Queue',
        reason: 'Redis latency or memory usage elevated',
        confidence: 0.85,
      });
      impactedServices.push('Rate Limiter', 'Cache Store', 'Background Queues');
      recommendedActions.push('Check Redis Diagnostics HUD', 'Review Redis memory fragmentation and eviction policies');
    }

    if (platformHealth.components.workerOutbox.status !== 'HEALTHY') {
      suspectedRootCauses.push({
        component: 'Outbox Event Worker',
        reason: 'Outbox pending lag or stuck processing events detected',
        confidence: 0.8,
      });
      impactedServices.push('Notifications', 'Async Event Processor');
      recommendedActions.push('Inspect Worker Diagnostics HUD', 'Restart or scale worker processes');
    }

    if (suspectedRootCauses.length === 0) {
      suspectedRootCauses.push({
        component: primaryAlert.component,
        reason: primaryAlert.description,
        confidence: 0.7,
      });
      impactedServices.push(primaryAlert.component);
      recommendedActions.push('Review metrics graph on HUD dashboard');
    }

    return {
      incidentId: `INC-${Date.now().toString(36).toUpperCase()}`,
      detectedAt: new Date().toISOString(),
      primaryAlert,
      correlatedAlerts,
      suspectedRootCauses,
      impactedServices,
      recommendedActions,
    };
  }
}
