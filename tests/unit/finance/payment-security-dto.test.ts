import { Prisma } from '@prisma/client';
import {
  getPaymentById,
  PaymentNotFoundError,
} from '@/modules/finance/application/services/payment-service';

describe('Phase 26 — Payment Security & DTO Sanitization', () => {
  const mockPaymentRecord = {
    id: 'pay-777',
    bookingId: 'book-777',
    customerId: 'cust-owner-777',
    status: 'CAPTURED' as const,
    amount: new Prisma.Decimal('1250.00'),
    currency: 'INR',
    provider: 'RAZORPAY',
    commissionAmount: new Prisma.Decimal('250.00'),
    driverEarningsAmount: new Prisma.Decimal('1000.00'),
    promotionId: null,
    promotionCodeSnapshot: null,
    discountAmount: null,
    capturedAt: new Date(),
    createdAt: new Date(),
  };

  it('strips internal financial fields (commissionAmount, driverEarningsAmount) for customer payment DTO', async () => {
    const mockDb = {
      payment: {
        findUnique: jest.fn().mockResolvedValue(mockPaymentRecord),
      },
    };

    const customerSummary = await getPaymentById(
      'cust-owner-777',
      'pay-777',
      mockDb as unknown as Parameters<typeof getPaymentById>[2],
    );

    expect(customerSummary.id).toBe('pay-777');
    expect(customerSummary.amount).toBe('1250.0000');
    expect(customerSummary.currency).toBe('INR');

    // CRITICAL SECURITY ASSERTION: Must not contain commission or driver earnings
    const rawSummary = customerSummary as unknown as Record<string, unknown>;
    expect(rawSummary.commissionAmount).toBeUndefined();
    expect(rawSummary.driverEarningsAmount).toBeUndefined();
  });

  it('enforces cross-customer ownership and throws PaymentNotFoundError when Customer A requests Customer B payment', async () => {
    const mockDb = {
      payment: {
        findUnique: jest.fn().mockResolvedValue(mockPaymentRecord),
      },
    };

    // Customer B ('cust-attacker-999') trying to view Customer A ('cust-owner-777') payment
    await expect(
      getPaymentById(
        'cust-attacker-999',
        'pay-777',
        mockDb as unknown as Parameters<typeof getPaymentById>[2],
      ),
    ).rejects.toThrow(PaymentNotFoundError);
  });
});
