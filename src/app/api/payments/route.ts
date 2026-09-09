import 'server-only';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { withPermission } from '@/modules/identity/authorization/route-guard';
import { PERMISSIONS } from '@/modules/identity/domain/permission-catalog';
import {
  createPaymentForBooking,
  listCustomerPayments,
} from '@/modules/finance/application/services/payment-service';

const createPaymentSchema = z.object({
  bookingId: z.string().min(1),
  idempotencyKey: z.string().min(1).optional(),
});

export const POST = withPermission(PERMISSIONS.PAYMENTS_CREATE, async (req, { principal }) => {
  const body = await req.json();

  let parsed: z.infer<typeof createPaymentSchema>;
  try {
    parsed = createPaymentSchema.parse(body);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'INVALID_INPUT', message: error.issues[0]?.message ?? 'Invalid input' },
        { status: 400 },
      );
    }
    throw error;
  }

  const idempotencyKey = req.headers.get('x-idempotency-key') ?? parsed.idempotencyKey ?? null;

  const checkoutInit = await createPaymentForBooking(principal.userId, {
    bookingId: parsed.bookingId,
    idempotencyKey,
  });

  return NextResponse.json({ payment: checkoutInit }, { status: 201 });
});

export const GET = withPermission(PERMISSIONS.PAYMENTS_READ, async (_req, { principal }) => {
  const payments = await listCustomerPayments(principal.userId);
  return NextResponse.json({ payments }, { status: 200 });
});
