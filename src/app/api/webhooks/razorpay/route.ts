import 'server-only';
import { NextResponse, type NextRequest } from 'next/server';
import { processRazorpayWebhook } from '@/modules/finance/application/services/webhook-service';
import { toErrorResponse } from '@/shared/errors/app-error';
import { logger } from '@/shared/logging/logger';

/**
 * Razorpay webhook receiver.
 *
 * Deliberately reads the RAW body via `req.text()`, not `req.json()` — this
 * is the first route handler in the codebase that needs to, and the reason
 * is specific to signature verification: the HMAC is computed over the
 * exact bytes Razorpay sent, and re-serializing a parsed JSON object is not
 * guaranteed to reproduce those bytes.
 *
 * Not wrapped in withAuth/withPermission — Razorpay is not an authenticated
 * application user; the HMAC signature (verified inside
 * processRazorpayWebhook, against RAZORPAY_WEBHOOK_SECRET) is what
 * authenticates this endpoint.
 */
export async function POST(req: NextRequest): Promise<NextResponse> {
  const rawBody = await req.text();
  const signatureHeader = req.headers.get('x-razorpay-signature');
  const eventIdHeader = req.headers.get('x-razorpay-event-id');

  try {
    const result = await processRazorpayWebhook({ rawBody, signatureHeader, eventIdHeader });

    if (result.outcome === 'signature_invalid') {
      // Do not retry — an invalid signature will never become valid.
      return NextResponse.json({ status: result.outcome }, { status: 400 });
    }

    return NextResponse.json({ status: result.outcome }, { status: 200 });
  } catch (error: unknown) {
    // processRazorpayWebhook has already durably persisted the event as
    // FAILED before re-throwing here; respond 5xx so Razorpay's own retry
    // mechanism gives this delivery another try in case the failure was
    // transient (see webhook-service.ts).
    logger.error({ err: error }, 'Razorpay webhook processing failed');
    return toErrorResponse(error, req.nextUrl.pathname);
  }
}
