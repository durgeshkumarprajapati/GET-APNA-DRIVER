import 'server-only';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { withRole } from '@/modules/identity/authorization/route-guard';
import { SYSTEM_ROLE_CODES } from '@/modules/identity/domain/role-catalog';
import { getCustomerWallet } from '@/modules/finance/application/services/customer-wallet-service';

const walletQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional(),
  pageSize: z.coerce.number().int().positive().max(50).optional(),
  type: z
    .enum(['all', 'credit', 'debit', 'booking_payment', 'refund', 'referral_reward'])
    .optional(),
});

/**
 * Customer-only (not just PAYMENTS_READ, which DRIVER also holds for their
 * own booking-as-customer history) — `/api/customer/wallet` is scoped by
 * role, not just by the authenticated userId, so a driver account can never
 * reach this endpoint at all. Ownership within the response is always
 * derived from `principal.userId`; no client-supplied id is ever accepted.
 */
export const GET = withRole(SYSTEM_ROLE_CODES.CUSTOMER, async (req, { principal }) => {
  const searchParams = req.nextUrl.searchParams;

  let query: z.infer<typeof walletQuerySchema>;
  try {
    query = walletQuerySchema.parse({
      page: searchParams.get('page') ?? undefined,
      pageSize: searchParams.get('pageSize') ?? undefined,
      type: searchParams.get('type') ?? undefined,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'INVALID_INPUT', message: error.issues[0]?.message ?? 'Invalid query parameters' },
        { status: 400 },
      );
    }
    throw error;
  }

  const wallet = await getCustomerWallet(principal.userId, query);
  return NextResponse.json({ wallet }, { status: 200 });
});
