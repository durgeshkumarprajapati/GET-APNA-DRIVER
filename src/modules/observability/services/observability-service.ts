import { prisma, type Db } from '@/shared/database/prisma';
import { PlatformHealthService } from '../health/platform-health-service';
import { DependencyHealthService } from '../health/dependency-health-service';
import { SloService } from './slo-service';
import { AlertEvaluationService } from './alert-evaluation-service';
import { IncidentCorrelationService } from './incident-correlation-service';
import { DiagnosticService } from './diagnostic-service';
import { HealthSnapshotRepository } from '../repositories/health-snapshot-repository';
import { OperationalMetricsRepository } from '../repositories/operational-metrics-repository';
import type { PlatformHealthSummary } from '../types/observability-types';

export class ObservabilityService {
  static async getPlatformHealth(db: Db = prisma): Promise<PlatformHealthSummary> {
    return PlatformHealthService.evaluatePlatformHealth(db, true);
  }

  static async getDependenciesHealth(db: Db = prisma) {
    return DependencyHealthService.evaluateHealth(db);
  }

  static async getSlos(db: Db = prisma) {
    return SloService.evaluateAllSlos(db);
  }

  static async getActiveAlerts(db: Db = prisma) {
    return AlertEvaluationService.getActiveAlerts(db);
  }

  static async evaluateAlerts(db: Db = prisma) {
    return AlertEvaluationService.evaluateRules(undefined, db);
  }

  static async getIncidentCorrelation(db: Db = prisma) {
    return IncidentCorrelationService.correlateIncidents(db);
  }

  static async getHealthHistory(limit: number = 60, db: Db = prisma) {
    return HealthSnapshotRepository.findHistory(limit, db);
  }

  static async getMetricAggregates(
    metricName: string,
    startTime: Date,
    endTime: Date,
    dimension: string = 'GLOBAL',
    db: Db = prisma,
  ) {
    return OperationalMetricsRepository.getMetricAggregates(
      metricName,
      startTime,
      endTime,
      dimension,
      db,
    );
  }

  static async runDiagnostics(target: 'database' | 'redis' | 'worker', db: Db = prisma) {
    if (target === 'database') {
      return DiagnosticService.runDatabaseDiagnostics(db);
    } else if (target === 'redis') {
      return DiagnosticService.runRedisDiagnostics();
    } else {
      return DiagnosticService.runWorkerDiagnostics(db);
    }
  }
}
