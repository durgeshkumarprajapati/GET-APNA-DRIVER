import 'server-only';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { withPermission } from '@/modules/identity/authorization/route-guard';
import { PERMISSIONS } from '@/modules/identity/domain/permission-catalog';
import { verifyAndCapturePayment } from '@/modules/finance/application/services/payment-service';

interface RouteParams {
  params: Promise<{ paymentId: string }>;
}

const verifyPaymentSchema = z.object({
  providerOrderId: z.string().min(1),
  providerPaymentId: z.string().min(1),
  signature: z.string().min(1),
});

/**
 * Server-side verification of the Razorpay checkout completion callback.
 * Never trusts this request alone — verifyAndCapturePayment independently
 * checks the HMAC signature and fetches the payment from Razorpay before
 * treating it as captured; this endpoint only forwards what the client
 * checkout widget returned.
 */
export const POST = withPermission<RouteParams>(
  PERMISSIONS.PAYMENTS_CREATE,
  async (req, { principal }, routeContext) => {
    const { paymentId } = await routeContext!.params;
    const body = await req.json();

    let parsed: z.infer<typeof verifyPaymentSchema>;
    try {
      parsed = verifyPaymentSchema.parse(body);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return NextResponse.json(
          { error: 'INVALID_INPUT', message: error.issues[0]?.message ?? 'Invalid input' },
          { status: 400 },
        );
      }
      throw error;
    }

    const payment = await verifyAndCapturePayment(principal.userId, { paymentId, ...parsed });
    return NextResponse.json({ payment }, { status: 200 });
  },
);
