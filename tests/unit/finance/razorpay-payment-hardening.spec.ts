import { Prisma } from '@prisma/client';
import {
  createPaymentForBooking,
  confirmCashPaymentByCustomer,
} from '@/modules/finance/application/services/payment-service';
import { processRazorpayWebhook } from '@/modules/finance/application/services/webhook-service';
import { paymentProvider } from '@/modules/finance/infrastructure/payment-provider';
import { env } from '@/shared/config/env';

const mockTx = {
  payment: {
    findUnique: jest.fn(),
    update: jest.fn().mockResolvedValue({
      id: 'payment-p67-1',
      providerOrderId: 'order_rzp_12345',
      amount: new Prisma.Decimal('250.0000'),
      currency: 'INR',
      status: 'PROCESSING',
      paymentMethod: 'ONLINE',
    }),
  },
  paymentAttempt: { create: jest.fn().mockResolvedValue({}) },
  paymentWebhookEvent: {
    create: jest.fn().mockResolvedValue({}),
    update: jest.fn().mockResolvedValue({}),
  },
};

jest.mock('@/shared/database/prisma', () => ({
  prisma: {
    $transaction: jest.fn((callback: (tx: unknown) => unknown) => callback(mockTx)),
    payment: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    booking: { findUnique: jest.fn() },
    paymentAttempt: { create: jest.fn() },
    paymentWebhookEvent: { findUnique: jest.fn(), create: jest.fn(), update: jest.fn() },
    taxInvoice: { findUnique: jest.fn(), create: jest.fn() },
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
    verifyWebhookSignature: jest.fn(),
  },
}));

jest.mock('@/modules/finance/application/services/pricing-service', () => ({
  calculateBookingAmount: jest.fn().mockResolvedValue({ amount: new Prisma.Decimal('250.0000') }),
  calculateCommission: jest.fn().mockResolvedValue({
    commissionPercentage: new Prisma.Decimal('20.0000'),
    commissionAmount: new Prisma.Decimal('50.0000'),
    driverEarningsAmount: new Prisma.Decimal('200.0000'),
  }),
}));

jest.mock('@/modules/finance/application/services/ledger-service', () => ({
  postFinancialTransaction: jest.fn().mockResolvedValue({ id: 'financial-txn-p67-1' }),
}));

jest.mock('@/modules/finance/application/services/wallet-service', () => ({
  applyWalletChange: jest.fn(),
}));

jest.mock('@/modules/tax-invoices/invoice-service', () => ({
  createTaxInvoiceForBooking: jest.fn().mockResolvedValue({ invoiceNumber: 'INV-2026-0001' }),
}));

describe('Phase 67: Razorpay Payment & Provider Hardening', () => {
  const customerId = 'cust-p67-1';
  const driverProfileId = 'driver-p67-1';
  const bookingId = 'booking-p67-1';
  const mockBooking = {
    id: bookingId,
    customerId,
    driverProfileId,
    status: 'TRIP_COMPLETED',
    grossFare: new Prisma.Decimal('250.0000'),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Hosted Checkout & Provider Init', () => {
    it('returns razorpayKeyId and razorpayPaymentPageUrl when creating payment checkout', async () => {
      const prismaMock = jest.requireMock('@/shared/database/prisma').prisma;
      prismaMock.payment.findUnique.mockResolvedValue(null);
      prismaMock.payment.findFirst.mockResolvedValue(null);
      prismaMock.booking.findUnique.mockResolvedValue(mockBooking);
      prismaMock.payment.create.mockResolvedValue({
        id: 'payment-p67-1',
        bookingId,
        customerId,
        amount: new Prisma.Decimal('250.0000'),
        currency: 'INR',
        status: 'CREATED',
        provider: 'RAZORPAY',
        providerOrderId: 'order_rzp_12345',
      });
      (paymentProvider.createOrder as jest.Mock).mockResolvedValue({
        providerOrderId: 'order_rzp_12345',
        amount: '250.0000',
        currency: 'INR',
      });
      mockTx.payment.update.mockResolvedValue({
        id: 'payment-p67-1',
        providerOrderId: 'order_rzp_12345',
        amount: new Prisma.Decimal('250.0000'),
        currency: 'INR',
        status: 'PROCESSING',
        paymentMethod: 'ONLINE',
      });

      const checkout = await createPaymentForBooking(customerId, {
        bookingId,
        paymentMethod: 'ONLINE',
      });

      expect(checkout.paymentId).toBe('payment-p67-1');
      expect(checkout.providerOrderId).toBe('order_rzp_12345');
      expect(checkout.amount).toBe('250.0000');
      expect(checkout.razorpayKeyId).toBe(env.RAZORPAY_KEY_ID ?? null);
      expect(checkout.razorpayPaymentPageUrl).toBe(env.RAZORPAY_PAYMENT_PAGE ?? null);
    });
  });

  describe('Webhook & Signature Verification', () => {
    it('verifies HMAC SHA-256 signature and captures payment safely', async () => {
      const rawBody = JSON.stringify({
        event: 'payment.captured',
        payload: {
          payment: {
            entity: {
              id: 'pay_rzp_99',
              order_id: 'order_rzp_12345',
              amount: 25000,
              status: 'captured',
            },
          },
        },
      });
      const validSignature = 'valid_sig_hash';

      (paymentProvider.verifyWebhookSignature as jest.Mock).mockReturnValue(true);

      const prismaMock = jest.requireMock('@/shared/database/prisma').prisma;
      prismaMock.paymentWebhookEvent.findUnique.mockResolvedValue(null);
      prismaMock.paymentWebhookEvent.create.mockResolvedValue({
        id: 'evt-p67-1',
        status: 'PROCESSING',
      });
      prismaMock.paymentWebhookEvent.update.mockResolvedValue({
        id: 'evt-p67-1',
        status: 'PROCESSED',
      });
      prismaMock.payment.findFirst.mockResolvedValue({
        id: 'payment-p67-1',
        bookingId,
        customerId,
        driverProfileId,
        status: 'PROCESSING',
        amount: new Prisma.Decimal('250.0000'),
        currency: 'INR',
        provider: 'RAZORPAY',
        providerOrderId: 'order_rzp_12345',
        paymentMethod: 'ONLINE',
        createdAt: new Date(),
      });
      mockTx.payment.findUnique.mockResolvedValue({
        id: 'payment-p67-1',
        bookingId,
        customerId,
        driverProfileId,
        status: 'PROCESSING',
        amount: new Prisma.Decimal('250.0000'),
        currency: 'INR',
        provider: 'RAZORPAY',
        providerOrderId: 'order_rzp_12345',
      });
      mockTx.payment.update.mockResolvedValue({
        id: 'payment-p67-1',
        bookingId,
        customerId,
        driverProfileId,
        status: 'CAPTURED',
        amount: new Prisma.Decimal('250.0000'),
        currency: 'INR',
        provider: 'RAZORPAY',
        providerOrderId: 'order_rzp_12345',
        providerPaymentId: 'pay_rzp_99',
        commissionAmount: new Prisma.Decimal('50.0000'),
        driverEarningsAmount: new Prisma.Decimal('200.0000'),
        discountAmount: null,
        capturedAt: new Date(),
        createdAt: new Date(),
      });

      const result = await processRazorpayWebhook({
        rawBody,
        signatureHeader: validSignature,
        eventIdHeader: 'evt_p67_1',
      });
      expect(result.outcome).toBe('processed');
    });

    it('rejects invalid HMAC webhook signature', async () => {
      const rawBody = '{"event":"payment.captured"}';

      (paymentProvider.verifyWebhookSignature as jest.Mock).mockReturnValue(false);

      const prismaMock = jest.requireMock('@/shared/database/prisma').prisma;
      prismaMock.paymentWebhookEvent.findUnique.mockResolvedValue(null);
      prismaMock.paymentWebhookEvent.create.mockResolvedValue({
        id: 'evt-bad',
        status: 'SIGNATURE_INVALID',
      });
      prismaMock.paymentWebhookEvent.update.mockResolvedValue({
        id: 'evt-bad',
        status: 'SIGNATURE_INVALID',
      });

      const result = await processRazorpayWebhook({
        rawBody,
        signatureHeader: 'invalid_sig',
        eventIdHeader: 'evt_bad',
      });

      expect(result.outcome).toBe('signature_invalid');
    });
  });

  describe('Regression: Cash Dual Confirmation & Refunds', () => {
    it('supports cash customer and driver dual confirmation', async () => {
      const prismaMock = jest.requireMock('@/shared/database/prisma').prisma;
      const now = new Date();
      prismaMock.booking.findUnique.mockResolvedValue(mockBooking);
      prismaMock.payment.findFirst.mockResolvedValue({
        id: 'payment-cash-1',
        bookingId,
        customerId,
        driverProfileId,
        status: 'PROCESSING',
        paymentMethod: 'CASH',
        amount: new Prisma.Decimal('250.0000'),
        currency: 'INR',
        cashCustomerConfirmedAt: null,
        cashDriverConfirmedAt: now,
        createdAt: now,
      });

      prismaMock.payment.findUnique.mockResolvedValue({
        id: 'payment-cash-1',
        bookingId,
        customerId,
        driverProfileId,
        status: 'CAPTURED',
        paymentMethod: 'CASH',
        amount: new Prisma.Decimal('250.0000'),
        currency: 'INR',
        cashCustomerConfirmedAt: now,
        cashDriverConfirmedAt: now,
        createdAt: now,
      });

      prismaMock.payment.update.mockResolvedValue({
        id: 'payment-cash-1',
        bookingId,
        customerId,
        driverProfileId,
        status: 'PROCESSING',
        paymentMethod: 'CASH',
        amount: new Prisma.Decimal('250.0000'),
        currency: 'INR',
        cashCustomerConfirmedAt: now,
        cashDriverConfirmedAt: now,
        createdAt: now,
      });

      (paymentProvider.fetchPayment as jest.Mock).mockResolvedValue({
        status: 'CAPTURED',
        providerPaymentId: 'cash_dummy',
      });

      mockTx.payment.findUnique.mockResolvedValue({
        id: 'payment-cash-1',
        bookingId,
        customerId,
        driverProfileId,
        status: 'PROCESSING',
        paymentMethod: 'CASH',
        amount: new Prisma.Decimal('250.0000'),
        currency: 'INR',
        cashCustomerConfirmedAt: now,
        cashDriverConfirmedAt: now,
      });

      mockTx.payment.update.mockResolvedValue({
        id: 'payment-cash-1',
        bookingId,
        customerId,
        driverProfileId,
        status: 'CAPTURED',
        paymentMethod: 'CASH',
        amount: new Prisma.Decimal('250.0000'),
        currency: 'INR',
        commissionAmount: new Prisma.Decimal('50.0000'),
        driverEarningsAmount: new Prisma.Decimal('200.0000'),
        capturedAt: now,
        createdAt: now,
      });

      const updated = await confirmCashPaymentByCustomer(customerId, bookingId);
      expect(updated.status).toBe('CAPTURED');
    });
  });
});
