import 'server-only';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { withPermission } from '@/modules/identity/authorization/route-guard';
import { PERMISSIONS } from '@/modules/identity/domain/permission-catalog';
import { verifyAndCaptureWalletTopup } from '@/modules/finance/application/services/wallet-topup-service';

interface RouteParams {
  params: Promise<{ topupId: string }>;
}

const verifyTopupSchema = z.object({
  providerOrderId: z.string().min(1),
  providerPaymentId: z.string().min(1),
  signature: z.string().min(1),
});

/**
 * Server-side verification of the Razorpay checkout completion callback for
 * a driver wallet debt-repayment order. Never trusts this request alone —
 * verifyAndCaptureWalletTopup independently checks the HMAC signature and
 * fetches the payment from Razorpay before treating it as captured. Mirrors
 * /api/payments/[paymentId]/verify.
 */
export const POST = withPermission<RouteParams>(
  PERMISSIONS.FINANCE_WALLET_DEBT_REPAY_CREATE,
  async (req, { principal }, routeContext) => {
    const { topupId } = await routeContext!.params;
    const body = await req.json();

    let parsed: z.infer<typeof verifyTopupSchema>;
    try {
      parsed = verifyTopupSchema.parse(body);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return NextResponse.json(
          { error: 'INVALID_INPUT', message: error.issues[0]?.message ?? 'Invalid input' },
          { status: 400 },
        );
      }
      throw error;
    }

    const topup = await verifyAndCaptureWalletTopup(principal.userId, { topupId, ...parsed });
    return NextResponse.json({ topup }, { status: 200 });
  },
);
