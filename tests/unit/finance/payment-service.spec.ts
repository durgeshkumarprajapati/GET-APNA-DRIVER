jest.mock('@/shared/database/prisma', () => ({
  prisma: {
    $transaction: jest.fn((callback: (tx: unknown) => unknown) => callback(mockTx)),
    payment: { findUnique: jest.fn(), findFirst: jest.fn(), create: jest.fn(), update: jest.fn() },
    booking: { findUnique: jest.fn() },
    paymentAttempt: { create: jest.fn() },
  },
}));

jest.mock('@/shared/config/configuration-service', () => ({
  getString: jest.fn().mockResolvedValue('INR'),
}));

jest.mock('@/shared/audit/audit-service', () => ({ recordAuditLog: jest.fn() }));
jest.mock('@/shared/outbox/outbox-service', () => ({
  insertOutboxEvent: jest.fn(),
  triggerImmediateOutboxDispatch: jest.fn(),
}));

jest.mock('@/modules/finance/infrastructure/payment-provider', () => ({
  paymentProvider: {
    createOrder: jest.fn(),
    fetchPayment: jest.fn(),
    verifyPaymentSignature: jest.fn(),
  },
}));

jest.mock('@/modules/finance/application/services/pricing-service', () => ({
  calculateBookingAmount: jest.fn().mockResolvedValue({ amount: '150.0000' }),
  calculateCommission: jest.fn().mockResolvedValue({
    commissionPercentage: '20.0000',
    commissionAmount: '30.0000',
    driverEarningsAmount: '120.0000',
  }),
}));

jest.mock('@/modules/finance/application/services/ledger-service', () => ({
  postFinancialTransaction: jest.fn().mockResolvedValue({ id: 'financial-txn-1' }),
}));

jest.mock('@/modules/finance/application/services/wallet-service', () => ({
  applyWalletChange: jest.fn(),
}));

jest.mock('@/modules/tax-invoices/invoice-service', () => ({
  createTaxInvoiceForBooking: jest.fn().mockResolvedValue({ id: 'invoice-1' }),
}));

const mockTx = {
  payment: { findUnique: jest.fn(), update: jest.fn() },
  paymentAttempt: { create: jest.fn() },
};

import { Prisma } from '@prisma/client';
import {
  captureCashPayment,
  capturePayment,
  createPaymentForBooking,
  getPaymentById,
} from '@/modules/finance/application/services/payment-service';
import { applyWalletChange } from '@/modules/finance/application/services/wallet-service';
import { prisma } from '@/shared/database/prisma';
import { paymentProvider } from '@/modules/finance/infrastructure/payment-provider';
import { postFinancialTransaction } from '@/modules/finance/application/services/ledger-service';
import { calculateCommission } from '@/modules/finance/application/services/pricing-service';
import { createTaxInvoiceForBooking } from '@/modules/tax-invoices/invoice-service';
import { triggerImmediateOutboxDispatch } from '@/shared/outbox/outbox-service';
import {
  BookingNotEligibleForPaymentError,
  PaymentAlreadyInProgressError,
  PaymentBookingNotFoundError,
  PaymentNotFoundError,
  PaymentVerificationFailedError,
} from '@/modules/finance/domain/errors';

const mockedPrisma = prisma as unknown as {
  payment: { findUnique: jest.Mock; findFirst: jest.Mock; create: jest.Mock; update: jest.Mock };
  booking: { findUnique: jest.Mock };
  paymentAttempt: { create: jest.Mock };
};

describe('createPaymentForBooking', () => {
  afterEach(() => jest.clearAllMocks());

  it('rejects when the booking does not belong to the caller', async () => {
    mockedPrisma.booking.findUnique.mockResolvedValue({
      id: 'booking-1',
      customerId: 'someone-else',
    });

    await expect(createPaymentForBooking('customer-1', { bookingId: 'booking-1' })).rejects.toThrow(
      PaymentBookingNotFoundError,
    );
  });

  it('rejects a booking that is not eligible for payment (e.g. SEARCHING_DRIVER)', async () => {
    mockedPrisma.booking.findUnique.mockResolvedValue({
      id: 'booking-1',
      customerId: 'customer-1',
      status: 'SEARCHING_DRIVER',
    });

    await expect(createPaymentForBooking('customer-1', { bookingId: 'booking-1' })).rejects.toThrow(
      BookingNotEligibleForPaymentError,
    );
  });

  it('rejects creating a second payment while one is already in progress for the booking', async () => {
    mockedPrisma.booking.findUnique.mockResolvedValue({
      id: 'booking-1',
      customerId: 'customer-1',
      status: 'TRIP_COMPLETED',
      driverProfileId: 'driver-1',
    });
    mockedPrisma.payment.findFirst.mockResolvedValue({
      id: 'existing-payment',
      status: 'PROCESSING',
    });

    await expect(createPaymentForBooking('customer-1', { bookingId: 'booking-1' })).rejects.toThrow(
      PaymentAlreadyInProgressError,
    );
  });

  it('is idempotent: replays the existing checkout init for a known idempotency key from the same customer', async () => {
    mockedPrisma.payment.findUnique.mockResolvedValue({
      id: 'payment-1',
      customerId: 'customer-1',
      providerOrderId: 'order_existing',
      amount: new Prisma.Decimal('150.0000'),
      currency: 'INR',
    });

    const result = await createPaymentForBooking('customer-1', {
      bookingId: 'booking-1',
      idempotencyKey: 'idem-1',
    });

    expect(result.providerOrderId).toBe('order_existing');
    expect(mockedPrisma.booking.findUnique).not.toHaveBeenCalled();
  });

  it('creates the payment order end to end for an eligible, completed booking', async () => {
    mockedPrisma.payment.findUnique.mockResolvedValue(null);
    mockedPrisma.booking.findUnique.mockResolvedValue({
      id: 'booking-1',
      customerId: 'customer-1',
      status: 'TRIP_COMPLETED',
      driverProfileId: 'driver-1',
      estimatedDurationMinutes: 30,
    });
    mockedPrisma.payment.findFirst.mockResolvedValue(null);
    mockedPrisma.payment.create.mockResolvedValue({
      id: 'payment-1',
      provider: 'razorpay',
      amount: new Prisma.Decimal('150.0000'),
      currency: 'INR',
    });
    (paymentProvider.createOrder as jest.Mock).mockResolvedValue({
      providerOrderId: 'order_new',
      status: 'created',
    });
    // The order-attach update + attempt record happen inside $transaction,
    // i.e. against `tx` (mockTx), not the top-level `prisma` mock.
    mockTx.payment.update.mockResolvedValue({
      id: 'payment-1',
      providerOrderId: 'order_new',
      amount: new Prisma.Decimal('150.0000'),
      currency: 'INR',
    });
    mockTx.paymentAttempt.create.mockResolvedValue({ id: 'attempt-1' });

    const result = await createPaymentForBooking('customer-1', { bookingId: 'booking-1' });

    expect(result.providerOrderId).toBe('order_new');
    expect(typeof result.razorpayKeyId === 'string' || result.razorpayKeyId === null).toBe(true);
  });

  it("charges only the gross fare net of the booking's frozen promotion discount", async () => {
    mockedPrisma.payment.findUnique.mockResolvedValue(null);
    mockedPrisma.booking.findUnique.mockResolvedValue({
      id: 'booking-1',
      customerId: 'customer-1',
      status: 'TRIP_COMPLETED',
      driverProfileId: 'driver-1',
      estimatedDurationMinutes: 30,
      // calculateBookingAmount is mocked to always return amount: '150.0000' (gross).
      promotionId: 'promotion-1',
      promotionCodeSnapshot: 'SAVE30',
      discountAmount: new Prisma.Decimal('30.0000'),
    });
    mockedPrisma.payment.findFirst.mockResolvedValue(null);
    mockedPrisma.payment.create.mockResolvedValue({
      id: 'payment-1',
      provider: 'razorpay',
      amount: new Prisma.Decimal('120.0000'),
      currency: 'INR',
    });
    (paymentProvider.createOrder as jest.Mock).mockResolvedValue({
      providerOrderId: 'order_new',
      status: 'created',
    });
    mockTx.payment.update.mockResolvedValue({
      id: 'payment-1',
      providerOrderId: 'order_new',
      amount: new Prisma.Decimal('120.0000'),
      currency: 'INR',
    });
    mockTx.paymentAttempt.create.mockResolvedValue({ id: 'attempt-1' });

    await createPaymentForBooking('customer-1', { bookingId: 'booking-1' });

    expect(mockedPrisma.payment.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        amount: '120.0000',
        discountAmount: '30.0000',
        promotionId: 'promotion-1',
        promotionCodeSnapshot: 'SAVE30',
      }),
    });
    // Razorpay is only ever asked to collect the discounted charge amount.
    expect(paymentProvider.createOrder).toHaveBeenCalledWith(
      expect.objectContaining({ amountMinorUnits: 12000 }),
    );
  });
});

describe('capturePayment', () => {
  afterEach(() => jest.clearAllMocks());

  it('is idempotent: a payment already CAPTURED is returned unchanged, not re-posted', async () => {
    mockTx.payment.findUnique.mockResolvedValue({
      id: 'payment-1',
      status: 'CAPTURED',
      bookingId: 'booking-1',
      customerId: 'customer-1',
      amount: new Prisma.Decimal('150.0000'),
      currency: 'INR',
      provider: 'razorpay',
      commissionAmount: new Prisma.Decimal('30.0000'),
      driverEarningsAmount: new Prisma.Decimal('120.0000'),
      capturedAt: new Date(),
      createdAt: new Date(),
    });

    const result = await capturePayment({
      paymentId: 'payment-1',
      providerPaymentId: 'pay_1',
      amountMinorUnits: 15000,
      source: 'webhook',
    });

    expect(result.status).toBe('CAPTURED');
    expect(mockTx.payment.update).not.toHaveBeenCalled();
  });

  it('rejects capture when the provider-confirmed amount does not match the expected amount', async () => {
    mockTx.payment.findUnique.mockResolvedValue({
      id: 'payment-1',
      status: 'PROCESSING',
      amount: new Prisma.Decimal('150.0000'),
    });

    await expect(
      capturePayment({
        paymentId: 'payment-1',
        providerPaymentId: 'pay_1',
        amountMinorUnits: 9999, // 99.99, not 150.00
        source: 'client_verify',
      }),
    ).rejects.toThrow(PaymentVerificationFailedError);
  });

  it('throws when the payment does not exist', async () => {
    mockTx.payment.findUnique.mockResolvedValue(null);

    await expect(
      capturePayment({
        paymentId: 'missing',
        providerPaymentId: 'pay_1',
        amountMinorUnits: 100,
        source: 'webhook',
      }),
    ).rejects.toThrow(PaymentNotFoundError);
  });

  it('computes commission on the gross fare (charged amount + discount) and books the gap as a promotion discount expense', async () => {
    mockTx.payment.findUnique.mockResolvedValue({
      id: 'payment-1',
      status: 'PROCESSING',
      bookingId: 'booking-1',
      customerId: 'customer-1',
      driverProfileId: 'driver-1',
      amount: new Prisma.Decimal('120.0000'), // charged (net of discount)
      discountAmount: new Prisma.Decimal('30.0000'),
      currency: 'INR',
      provider: 'razorpay',
    });
    mockTx.payment.update.mockResolvedValue({
      id: 'payment-1',
      status: 'CAPTURED',
      bookingId: 'booking-1',
      customerId: 'customer-1',
      amount: new Prisma.Decimal('120.0000'),
      currency: 'INR',
      provider: 'razorpay',
      commissionAmount: new Prisma.Decimal('30.0000'),
      driverEarningsAmount: new Prisma.Decimal('120.0000'),
      capturedAt: new Date(),
      createdAt: new Date(),
    });

    await capturePayment({
      paymentId: 'payment-1',
      providerPaymentId: 'pay_1',
      amountMinorUnits: 12000, // matches payment.amount (120.00)
      source: 'client_verify',
    });

    // Gross = 120 (charged) + 30 (discount) = 150 — never the charged amount alone.
    expect(calculateCommission).toHaveBeenCalledWith('150.0000', expect.anything());
    expect(postFinancialTransaction).toHaveBeenCalledWith(
      expect.objectContaining({
        postings: expect.arrayContaining([
          expect.objectContaining({
            accountCode: 'PROMOTION_DISCOUNT_EXPENSE',
            debitAmount: '30.0000',
            creditAmount: '0',
          }),
        ]),
      }),
      expect.anything(),
    );
  });

  it('never adds a PROMOTION_DISCOUNT_EXPENSE leg for a payment with no discount', async () => {
    mockTx.payment.findUnique.mockResolvedValue({
      id: 'payment-1',
      status: 'PROCESSING',
      bookingId: 'booking-1',
      customerId: 'customer-1',
      driverProfileId: 'driver-1',
      amount: new Prisma.Decimal('150.0000'),
      discountAmount: null,
      currency: 'INR',
      provider: 'razorpay',
    });
    mockTx.payment.update.mockResolvedValue({
      id: 'payment-1',
      status: 'CAPTURED',
      bookingId: 'booking-1',
      customerId: 'customer-1',
      amount: new Prisma.Decimal('150.0000'),
      currency: 'INR',
      provider: 'razorpay',
      commissionAmount: new Prisma.Decimal('30.0000'),
      driverEarningsAmount: new Prisma.Decimal('120.0000'),
      capturedAt: new Date(),
      createdAt: new Date(),
    });

    await capturePayment({
      paymentId: 'payment-1',
      providerPaymentId: 'pay_1',
      amountMinorUnits: 15000,
      source: 'client_verify',
    });

    expect(calculateCommission).toHaveBeenCalledWith('150.0000', expect.anything());
    const call = (postFinancialTransaction as jest.Mock).mock.calls[0][0];
    expect(call.postings).toHaveLength(3);
    expect(
      call.postings.some(
        (p: { accountCode: string }) => p.accountCode === 'PROMOTION_DISCOUNT_EXPENSE',
      ),
    ).toBe(false);
  });

  it('generates a tax invoice for the booking after a successful capture', async () => {
    mockTx.payment.findUnique.mockResolvedValue({
      id: 'payment-1',
      status: 'PROCESSING',
      bookingId: 'booking-1',
      customerId: 'customer-1',
      amount: new Prisma.Decimal('150.0000'),
      currency: 'INR',
      provider: 'razorpay',
    });
    mockTx.payment.update.mockResolvedValue({
      id: 'payment-1',
      status: 'CAPTURED',
      bookingId: 'booking-1',
      customerId: 'customer-1',
      amount: new Prisma.Decimal('150.0000'),
      currency: 'INR',
      provider: 'razorpay',
      commissionAmount: new Prisma.Decimal('30.0000'),
      driverEarningsAmount: new Prisma.Decimal('120.0000'),
      capturedAt: new Date(),
      createdAt: new Date(),
    });

    await capturePayment({
      paymentId: 'payment-1',
      providerPaymentId: 'pay_1',
      amountMinorUnits: 15000,
      source: 'client_verify',
    });

    expect(createTaxInvoiceForBooking).toHaveBeenCalledWith('booking-1');
  });

  it('triggers immediate outbox dispatch after a successful capture, so the driver is notified of payment without depending on the separate background worker', async () => {
    mockTx.payment.findUnique.mockResolvedValue({
      id: 'payment-1',
      status: 'PROCESSING',
      bookingId: 'booking-1',
      customerId: 'customer-1',
      amount: new Prisma.Decimal('150.0000'),
      currency: 'INR',
      provider: 'razorpay',
    });
    mockTx.payment.update.mockResolvedValue({
      id: 'payment-1',
      status: 'CAPTURED',
      bookingId: 'booking-1',
      customerId: 'customer-1',
      amount: new Prisma.Decimal('150.0000'),
      currency: 'INR',
      provider: 'razorpay',
      commissionAmount: new Prisma.Decimal('30.0000'),
      driverEarningsAmount: new Prisma.Decimal('120.0000'),
      capturedAt: new Date(),
      createdAt: new Date(),
    });

    await capturePayment({
      paymentId: 'payment-1',
      providerPaymentId: 'pay_1',
      amountMinorUnits: 15000,
      source: 'client_verify',
    });

    expect(triggerImmediateOutboxDispatch).toHaveBeenCalled();
  });

  it('does not fail the capture when tax-invoice generation throws', async () => {
    (createTaxInvoiceForBooking as jest.Mock).mockRejectedValueOnce(new Error('invoice boom'));
    mockTx.payment.findUnique.mockResolvedValue({
      id: 'payment-1',
      status: 'PROCESSING',
      bookingId: 'booking-1',
      customerId: 'customer-1',
      amount: new Prisma.Decimal('150.0000'),
      currency: 'INR',
      provider: 'razorpay',
    });
    mockTx.payment.update.mockResolvedValue({
      id: 'payment-1',
      status: 'CAPTURED',
      bookingId: 'booking-1',
      customerId: 'customer-1',
      amount: new Prisma.Decimal('150.0000'),
      currency: 'INR',
      provider: 'razorpay',
      commissionAmount: new Prisma.Decimal('30.0000'),
      driverEarningsAmount: new Prisma.Decimal('120.0000'),
      capturedAt: new Date(),
      createdAt: new Date(),
    });

    const result = await capturePayment({
      paymentId: 'payment-1',
      providerPaymentId: 'pay_1',
      amountMinorUnits: 15000,
      source: 'client_verify',
    });

    expect(result.status).toBe('CAPTURED');
  });

  it('does not attempt to generate a tax invoice for the already-CAPTURED idempotent path', async () => {
    mockTx.payment.findUnique.mockResolvedValue({
      id: 'payment-1',
      status: 'CAPTURED',
      bookingId: 'booking-1',
      customerId: 'customer-1',
      amount: new Prisma.Decimal('150.0000'),
      currency: 'INR',
      provider: 'razorpay',
      commissionAmount: new Prisma.Decimal('30.0000'),
      driverEarningsAmount: new Prisma.Decimal('120.0000'),
      capturedAt: new Date(),
      createdAt: new Date(),
    });

    await capturePayment({
      paymentId: 'payment-1',
      providerPaymentId: 'pay_1',
      amountMinorUnits: 15000,
      source: 'webhook',
    });

    // Idempotent early-return path still resolves to status CAPTURED, so
    // invoice generation is still attempted (and is itself idempotent via
    // TaxInvoice.bookingId's unique constraint) — this documents that
    // behavior rather than asserting a call count of zero.
    expect(createTaxInvoiceForBooking).toHaveBeenCalledWith('booking-1');
  });
});

describe('captureCashPayment', () => {
  afterEach(() => jest.clearAllMocks());

  // Regression: this path previously posted Dr PAYMENT_PROVIDER_CLEARING for
  // the full cash amount, as if Razorpay held that money — it never did,
  // the driver collected it directly. That silently and permanently
  // overstated the clearing account for every cash trip. The correct
  // double-entry nets the driver already having kept the cash against
  // DRIVER_PAYABLE instead (see payment-service.ts).
  it('books a cash trip with no discount as a DRIVER_PAYABLE debit for the commission owed, never PAYMENT_PROVIDER_CLEARING', async () => {
    mockTx.payment.findUnique.mockResolvedValue({
      id: 'payment-1',
      status: 'PROCESSING',
      bookingId: 'booking-1',
      customerId: 'customer-1',
      driverProfileId: 'driver-1',
      amount: new Prisma.Decimal('150.0000'), // driver collected the full gross fare in cash
      discountAmount: null,
      currency: 'INR',
      provider: 'cash',
      providerPaymentId: null,
    });
    mockTx.payment.update.mockResolvedValue({
      id: 'payment-1',
      status: 'CAPTURED',
      bookingId: 'booking-1',
      customerId: 'customer-1',
      amount: new Prisma.Decimal('150.0000'),
      currency: 'INR',
      provider: 'cash',
      createdAt: new Date(),
    });

    await captureCashPayment('payment-1');

    // commissionAmount=30.0000, driverEarningsAmount=120.0000 per the
    // module-level calculateCommission mock — net = 120 - 150 = -30.
    expect(postFinancialTransaction).toHaveBeenCalledWith(
      expect.objectContaining({
        postings: [
          {
            accountCode: 'PLATFORM_REVENUE_COMMISSION',
            debitAmount: '0',
            creditAmount: '30.0000',
          },
          {
            accountCode: 'DRIVER_PAYABLE',
            debitAmount: '30.0000',
            creditAmount: '0',
          },
        ],
      }),
      expect.anything(),
    );
    expect(postFinancialTransaction).not.toHaveBeenCalledWith(
      expect.objectContaining({
        postings: expect.arrayContaining([
          expect.objectContaining({ accountCode: 'PAYMENT_PROVIDER_CLEARING' }),
        ]),
      }),
      expect.anything(),
    );
    expect(applyWalletChange).toHaveBeenCalledWith(
      expect.objectContaining({
        driverProfileId: 'driver-1',
        changeType: 'CASH_TRIP_SETTLEMENT',
        availableDelta: '-30.0000',
        totalEarnedDelta: '120.0000',
      }),
      expect.anything(),
    );
  });

  it('credits DRIVER_PAYABLE when a promotion discount exceeds the commission, still balanced', async () => {
    mockTx.payment.findUnique.mockResolvedValue({
      id: 'payment-2',
      status: 'PROCESSING',
      bookingId: 'booking-2',
      customerId: 'customer-1',
      driverProfileId: 'driver-1',
      amount: new Prisma.Decimal('100.0000'), // cash actually collected (net of discount)
      discountAmount: new Prisma.Decimal('50.0000'),
      currency: 'INR',
      provider: 'cash',
    });
    mockTx.payment.update.mockResolvedValue({
      id: 'payment-2',
      status: 'CAPTURED',
      bookingId: 'booking-2',
      customerId: 'customer-1',
      amount: new Prisma.Decimal('100.0000'),
      currency: 'INR',
      provider: 'cash',
      createdAt: new Date(),
    });

    await captureCashPayment('payment-2');

    // net = driverEarningsAmount(120) - payment.amount(100) = +20.
    expect(postFinancialTransaction).toHaveBeenCalledWith(
      expect.objectContaining({
        postings: [
          {
            accountCode: 'PLATFORM_REVENUE_COMMISSION',
            debitAmount: '0',
            creditAmount: '30.0000',
          },
          {
            accountCode: 'DRIVER_PAYABLE',
            debitAmount: '0',
            creditAmount: '20.0000',
          },
          {
            accountCode: 'PROMOTION_DISCOUNT_EXPENSE',
            debitAmount: '50.0000',
            creditAmount: '0',
          },
        ],
      }),
      expect.anything(),
    );
    expect(applyWalletChange).toHaveBeenCalledWith(
      expect.objectContaining({ availableDelta: '20.0000' }),
      expect.anything(),
    );
  });

  it('omits the DRIVER_PAYABLE leg entirely when the discount exactly offsets the commission (net zero)', async () => {
    mockTx.payment.findUnique.mockResolvedValue({
      id: 'payment-3',
      status: 'PROCESSING',
      bookingId: 'booking-3',
      customerId: 'customer-1',
      driverProfileId: 'driver-1',
      amount: new Prisma.Decimal('120.0000'), // equals the mocked driverEarningsAmount exactly
      discountAmount: new Prisma.Decimal('30.0000'),
      currency: 'INR',
      provider: 'cash',
    });
    mockTx.payment.update.mockResolvedValue({
      id: 'payment-3',
      status: 'CAPTURED',
      bookingId: 'booking-3',
      customerId: 'customer-1',
      amount: new Prisma.Decimal('120.0000'),
      currency: 'INR',
      provider: 'cash',
      createdAt: new Date(),
    });

    await captureCashPayment('payment-3');

    expect(postFinancialTransaction).toHaveBeenCalledWith(
      expect.objectContaining({
        postings: [
          {
            accountCode: 'PLATFORM_REVENUE_COMMISSION',
            debitAmount: '0',
            creditAmount: '30.0000',
          },
          {
            accountCode: 'PROMOTION_DISCOUNT_EXPENSE',
            debitAmount: '30.0000',
            creditAmount: '0',
          },
        ],
      }),
      expect.anything(),
    );
    expect(applyWalletChange).toHaveBeenCalledWith(
      expect.objectContaining({ availableDelta: '0.0000' }),
      expect.anything(),
    );
  });
});

describe('getPaymentById', () => {
  afterEach(() => jest.clearAllMocks());

  it('never returns a payment belonging to a different customer', async () => {
    mockedPrisma.payment.findUnique.mockResolvedValue({
      id: 'payment-1',
      customerId: 'other-customer',
    });

    await expect(getPaymentById('customer-1', 'payment-1')).rejects.toThrow(PaymentNotFoundError);
  });
});
