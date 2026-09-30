import 'server-only';
import { prisma, type Db } from '@/shared/database/prisma';
import { logger } from '@/shared/logging/logger';
import { getBoolean, getInteger } from '@/shared/config/configuration-service';
import { RedisLockService } from '@/shared/infrastructure/redis-lock-service';

const RECONCILIATION_LOCK_KEY = 'lock:operations-execution-reconciliation';
const DEFAULT_BATCH_SIZE = 100;

/** Module-level self-gate — see trip-reliability-sweep-job.ts for why this exists instead of an iteration-count modulo. */
let lastRunAt = 0;

export interface OperationsExecutionReconciliationResult {
  reconciledCount: number;
  skipped: boolean;
}

/**
 * "Recovery & Reconciliation": if the worker process (or the request that
 * called executeOperationsAction) crashes or is killed between marking an
 * OperationsDecisionExecution PROCESSING and marking it SUCCEEDED/FAILED,
 * that row is stuck PROCESSING forever — nothing else ever revisits it,
 * and its Redis lock (a 15s TTL) has long since expired, so a naive retry
 * would just create attempt #2 sitting alongside a permanently-orphaned
 * attempt #1 rather than ever resolving what actually happened to it.
 *
 * This periodically finds executions that have been PROCESSING for longer
 * than any real action in this codebase could legitimately take, and marks
 * them FAILED with an explicit reconciliation failure code — safe because
 * the conditional updateMany only flips a row that is *still* PROCESSING
 * (a genuinely-still-running or just-now-completed execution loses the
 * race harmlessly, same pattern as assignment-expiry-sweep-job.ts).
 */
export async function runOperationsExecutionReconciliation(
  db: Db = prisma,
): Promise<OperationsExecutionReconciliationResult> {
  const enabled = await getBoolean('operations.reconciliation.enabled', true, db);
  if (!enabled) {
    return { reconciledCount: 0, skipped: true };
  }

  const intervalSeconds = await getInteger('operations.reconciliation.interval_seconds', 300, db);
  if (Date.now() - lastRunAt < intervalSeconds * 1000) {
    return { reconciledCount: 0, skipped: true };
  }

  const acquired = await RedisLockService.acquireLock(RECONCILIATION_LOCK_KEY, 60_000);
  if (!acquired) {
    return { reconciledCount: 0, skipped: true };
  }

  try {
    lastRunAt = Date.now();
    const staleThresholdSeconds = await getInteger(
      'operations.reconciliation.stale_threshold_seconds',
      600,
      db,
    );
    const batchSize = await getInteger(
      'operations.reconciliation.batch_size',
      DEFAULT_BATCH_SIZE,
      db,
    );
    const staleCutoff = new Date(Date.now() - staleThresholdSeconds * 1000);

    const stuck = await db.operationsDecisionExecution.findMany({
      where: { status: 'PROCESSING', startedAt: { lt: staleCutoff } },
      select: { id: true, decisionId: true },
      take: batchSize,
    });

    let reconciledCount = 0;
    for (const execution of stuck) {
      try {
        const updated = await db.operationsDecisionExecution.updateMany({
          where: { id: execution.id, status: 'PROCESSING' },
          data: {
            status: 'FAILED',
            failureCode: 'INTERRUPTED_EXECUTION',
            failureSummary:
              'Execution did not complete before the process restarted or timed out; reconciled by the background sweep so it can be safely retried.',
            completedAt: new Date(),
          },
        });
        if (updated.count > 0) reconciledCount++;
      } catch (err) {
        logger.error(
          { err, executionId: execution.id, decisionId: execution.decisionId },
          'Failed to reconcile one stuck operations decision execution; continuing with the batch',
        );
      }
    }

    return { reconciledCount, skipped: false };
  } finally {
    await RedisLockService.releaseLock(RECONCILIATION_LOCK_KEY);
  }
}
