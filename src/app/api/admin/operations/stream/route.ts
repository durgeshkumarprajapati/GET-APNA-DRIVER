import { NextRequest, NextResponse } from 'next/server';
import { withPermission } from '@/modules/identity/authorization/route-guard';
import { PERMISSIONS } from '@/modules/identity/domain/permission-catalog';
import {
  getOperationsCommandSummary,
  getReliabilityIntelligence,
  getCapacityForecastSummary,
} from '@/modules/operations';
import { logger } from '@/shared/logging/logger';

export const GET = withPermission(PERMISSIONS.ADMIN_OPERATIONS_READ, async (req: NextRequest) => {
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      let isClosed = false;

      const sendUpdate = async () => {
        if (isClosed) return;
        try {
          const [summary, intelligence, capacityForecast] = await Promise.all([
            getOperationsCommandSummary(),
            getReliabilityIntelligence(7),
            getCapacityForecastSummary('1h'),
          ]);

          const payload = JSON.stringify({
            timestamp: new Date().toISOString(),
            summary,
            intelligence,
            capacityForecast,
          });

          controller.enqueue(encoder.encode(`data: ${payload}\n\n`));
        } catch (err) {
          logger.error({ err }, 'Error emitting operations command center stream event');
        }
      };

      // Send initial heartbeat update immediately
      await sendUpdate();

      // Setup 10-second interval stream
      const interval = setInterval(() => {
        void sendUpdate();
      }, 10000);

      req.signal.addEventListener('abort', () => {
        isClosed = true;
        clearInterval(interval);
        try {
          controller.close();
        } catch {
          // Stream already closed
        }
      });
    },
  });

  return new NextResponse(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
    },
  });
});
