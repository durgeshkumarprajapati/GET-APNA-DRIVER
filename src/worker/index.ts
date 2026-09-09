// Must run before any import that transitively reaches `env.ts` — this
// process is started directly (`tsx src/worker/index.ts`), not through the
// Prisma CLI or Next.js, neither of which loads `.env` for it.
import 'dotenv/config';
import { logger } from '@/shared/logging/logger';
import { outboxDispatcherService } from './outbox/outbox-dispatcher-service';
import { registerNotificationEventHandlers } from './jobs/notification-event-handlers';
import { registerSafetyAndDisputeEventHandlers } from './jobs/safety-dispute-event-handlers';
import { runRetentionCleanupJob } from './jobs/cleanup-jobs';

async function bootstrapWorker(): Promise<void> {
  logger.info('Initializing Get Apna Driver Background Worker Process...');

  // 1. Register domain outbox event handlers
  registerNotificationEventHandlers();
  registerSafetyAndDisputeEventHandlers();

  let isRunning = true;

  // Signal handlers for graceful shutdown
  const shutdown = (signal: string) => {
    logger.info({ signal }, 'Worker received shutdown signal. Stopping outbox loop...');
    isRunning = false;
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

      // If no events were processed, sleep briefly before polling again
      if (processedCount === 0) {
        await new Promise((resolve) => setTimeout(resolve, 3000));
      }
    } catch (err) {
      logger.error({ error: err }, 'Unhandled error in worker polling loop; pausing before retry');
      await new Promise((resolve) => setTimeout(resolve, 5000));
    }
  }

  logger.info('Worker loop stopped gracefully.');
}

// Execute bootstrap if run directly
if (require.main === module) {
  bootstrapWorker().catch((err) => {
    logger.error({ error: err }, 'Fatal error starting background worker');
    process.exit(1);
  });
}
