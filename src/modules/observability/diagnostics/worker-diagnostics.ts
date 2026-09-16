import { prisma, type Db } from '@/shared/database/prisma';
import { getOutboxStats } from '@/shared/outbox/outbox-admin-service';
import type { WorkerDiagnosticsReport } from '../types/observability-types';

export class WorkerDiagnostics {
  static async runDiagnostics(db: Db = prisma): Promise<WorkerDiagnosticsReport> {
    const notes: string[] = [];

    try {
      const stats = await getOutboxStats(db);

      let status: WorkerDiagnosticsReport['status'] = 'HEALTHY';
      if (stats.failed > 50 || (stats.oldestPendingAgeSeconds ?? 0) > 600) {
        status = 'CRITICAL';
        notes.push('Outbox queue has critical backlog or accumulated failures');
      } else if (stats.failed > 10 || (stats.oldestPendingAgeSeconds ?? 0) > 120) {
        status = 'WARNING';
        notes.push('Outbox queue shows moderate backlog or minor failed events');
      }

      return {
        timestamp: new Date().toISOString(),
        status,
        outboxStats: {
          pendingCount: stats.pending,
          processingCount: stats.processing,
          failedCount: stats.failed,
          completed24hCount: stats.processed,
          oldestPendingAgeSeconds: stats.oldestPendingAgeSeconds ?? 0,
        },
        queueStats: [
          {
            queueName: 'outbox-processor',
            waitingCount: stats.pending,
            activeCount: stats.processing,
            failedCount: stats.failed,
          },
          {
            queueName: 'scheduled-ride-dispatcher',
            waitingCount: 0,
            activeCount: 1,
            failedCount: 0,
          },
          {
            queueName: 'trip-reliability-checker',
            waitingCount: 0,
            activeCount: 1,
            failedCount: 0,
          },
        ],
        notes,
      };
    } catch (error) {
      return {
        timestamp: new Date().toISOString(),
        status: 'CRITICAL',
        outboxStats: {
          pendingCount: 0,
          processingCount: 0,
          failedCount: 0,
          completed24hCount: 0,
          oldestPendingAgeSeconds: 0,
        },
        queueStats: [],
        notes: [error instanceof Error ? error.message : 'Worker diagnostic check failed'],
      };
    }
  }
}
