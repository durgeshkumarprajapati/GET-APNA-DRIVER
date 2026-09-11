import 'server-only';
import { NextRequest, NextResponse } from 'next/server';
import { getTelephonyProvider } from '@/modules/calling/infrastructure/telephony-provider';
import { callingService } from '@/modules/calling/application/services/calling-service';

export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text();
    const provider = getTelephonyProvider();

    // Extract headers
    const headerObj: Record<string, string> = {};
    req.headers.forEach((val, key) => {
      headerObj[key.toLowerCase()] = val;
    });

    const isVerified = provider.verifyWebhookSignature(headerObj, rawBody);
    if (!isVerified) {
      return NextResponse.json(
        { error: 'UNAUTHORIZED', message: 'Invalid telephony webhook signature.' },
        { status: 401 },
      );
    }

    let parsedBody: Record<string, unknown> = {};
    try {
      if (headerObj['content-type']?.includes('application/x-www-form-urlencoded')) {
        const params = new URLSearchParams(rawBody);
        parsedBody = Object.fromEntries(params.entries());
      } else {
        parsedBody = JSON.parse(rawBody);
      }
    } catch {
      parsedBody = { raw: rawBody };
    }

    const webhookPayload = provider.parseWebhookPayload(parsedBody);
    const updated = await callingService.handleTelephonyWebhook(webhookPayload);

    return NextResponse.json({
      success: true,
      processed: !!updated,
      sessionId: updated?.id || null,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Error processing telephony webhook.';
    return NextResponse.json({ error: 'WEBHOOK_PROCESSING_FAILED', message }, { status: 500 });
  }
}
