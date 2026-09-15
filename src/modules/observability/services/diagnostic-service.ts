import { prisma, type Db } from '@/shared/database/prisma';
import { DatabaseDiagnostics } from '../diagnostics/database-diagnostics';
import { RedisDiagnostics } from '../diagnostics/redis-diagnostics';
import { WorkerDiagnostics } from '../diagnostics/worker-diagnostics';
import type { DatabaseDiagnosticsReport, RedisDiagnosticsReport, WorkerDiagnosticsReport } from '../types/observability-types';

export class DiagnosticService {
  static async runDatabaseDiagnostics(db: Db = prisma): Promise<DatabaseDiagnosticsReport> {
    return DatabaseDiagnostics.runDiagnostics(db);
  }

  static async runRedisDiagnostics(): Promise<RedisDiagnosticsReport> {
    return RedisDiagnostics.runDiagnostics();
  }

  static async runWorkerDiagnostics(db: Db = prisma): Promise<WorkerDiagnosticsReport> {
    return WorkerDiagnostics.runDiagnostics(db);
  }
}
