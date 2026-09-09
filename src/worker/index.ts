// Must run before any import that transitively reaches `env.ts` — this
// process is started directly (`tsx src/worker/index.ts`), not through the
// Prisma CLI or Next.js, neither of which loads `.env` for it.
import 'dotenv/config';
import { logger } from '@/shared/logging/logger';
import { prisma } from '@/shared/database/prisma';
import { redis } from '@/shared/redis/client';
import { getInteger } from '@/shared/config/configuration-service';
import { outboxDispatcherService } from './outbox/outbox-dispatcher-service';
import { registerNotificationEventHandlers } from './jobs/notification-event-handlers';
import { registerSafetyAndDisputeEventHandlers } from './jobs/safety-dispute-event-handlers';
import { runRetentionCleanupJob } from './jobs/cleanup-jobs';

/** Hard ceiling on how long shutdown waits for the current batch to drain before forcing exit. */
const SHUTDOWN_FORCE_EXIT_MS = 30_000;

async function bootstrapWorker(): Promise<void> {
  logger.info('Initializing Get Apna Driver Background Worker Process...');

  // 1. Register domain outbox event handlers
  registerNotificationEventHandlers();
  registerSafetyAndDisputeEventHandlers();

  let isRunning = true;
  let shutdownRequested = false;

  // Signal handlers for graceful shutdown. A second signal (or the first one
  // ignored past SHUTDOWN_FORCE_EXIT_MS) force-exits rather than hanging
  // forever if a batch is stuck on a slow/hung handler.
  const shutdown = (signal: string) => {
    if (shutdownRequested) {
      logger.warn({ signal }, 'Second shutdown signal received; forcing immediate exit.');
      process.exit(1);
    }
    shutdownRequested = true;
    logger.info({ signal }, 'Worker received shutdown signal. Draining current batch...');
    isRunning = false;
    setTimeout(() => {
      logger.warn(
        { signal, timeoutMs: SHUTDOWN_FORCE_EXIT_MS },
        'Graceful shutdown timed out; forcing exit.',
      );
      process.exit(1);
    }, SHUTDOWN_FORCE_EXIT_MS).unref();
  };

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));

  logger.info('Worker started successfully. Entering outbox polling loop...');

  let iteration = 0;
  while (isRunning) {
    try {
      const processedCount = await outboxDispatcherService.runBatch();

      // Periodically run cleanup (e.g. every 100 iterations)
      iteration++;
      if (iteration % 100 === 0) {
        await runRetentionCleanupJob();
      }

      // If no events were processed, sleep briefly before polling again.
      // Configurable via SystemConfiguration so ops can tune poll cadence
      // without a deploy (previously hardcoded, ignoring the seeded
      // notification.outbox.poll_interval_seconds key entirely).
      if (processedCount === 0 && isRunning) {
        const pollIntervalSeconds = await getInteger(
          'notification.outbox.poll_interval_seconds',
          5,
        );
        await new Promise((resolve) => setTimeout(resolve, pollIntervalSeconds * 1000));
      }
    } catch (err) {
      logger.error({ error: err }, 'Unhandled error in worker polling loop; pausing before retry');
      await new Promise((resolve) => setTimeout(resolve, 5000));
    }
  }

  logger.info('Worker loop stopped gracefully. Closing connections...');
  await Promise.allSettled([prisma.$disconnect(), redis.quit()]);
  logger.info('Worker shutdown complete.');
}

// Execute bootstrap if run directly
if (require.main === module) {
  bootstrapWorker()
    .then(() => process.exit(0))
    .catch((err) => {
      logger.error({ error: err }, 'Fatal error starting background worker');
      process.exit(1);
    });
}
