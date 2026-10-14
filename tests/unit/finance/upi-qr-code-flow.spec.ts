import { Prisma } from '@prisma/client';

const mockTx = {
  payment: { findUnique: jest.fn(), update: jest.fn() },
  paymentAttempt: { create: jest.fn() },
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
    createUpiQrCode: jest.fn(),
    closeUpiQrCode: jest.fn(),
    verifyWebhookSignature: jest.fn(),
    capturePaymentOnProvider: jest.fn(),
  },
}));

jest.mock('@/modules/finance/application/services/pricing-service', () => ({
  calculateBookingAmount: jest.fn().mockResolvedValue({ amount: '200.0000' }),
  calculateCommission: jest.fn().mockResolvedValue({
    commissionPercentage: '20.0000',
    commissionAmount: '40.0000',
    driverEarningsAmount: '160.0000',
  }),
}));

jest.mock('@/modules/finance/application/services/ledger-service', () => ({
  postFinancialTransaction: jest.fn().mockResolvedValue({ id: 'financial-txn-qr-1' }),
}));

jest.mock('@/modules/finance/application/services/wallet-service', () => ({
  applyWalletChange: jest.fn(),
}));

jest.mock('@/modules/tax-invoices/invoice-service', () => ({
  createTaxInvoiceForBooking: jest.fn().mockResolvedValue({ id: 'tax-invoice-qr-1' }),
}));

import { createUpiQrPaymentForBooking } from '@/modules/finance/application/services/payment-service';
import { processRazorpayWebhook } from '@/modules/finance/application/services/webhook-service';
import { paymentProvider } from '@/modules/finance/infrastructure/payment-provider';
import {
  BookingNotEligibleForPaymentError,
  CashPaymentConfirmationForbiddenError,
  PaymentAlreadyInProgressError,
  PaymentProviderError,
} from '@/modules/finance/domain/errors';
import { prisma } from '@/shared/database/prisma';

const mockedPrisma = prisma as unknown as {
  payment: {
    findUnique: jest.Mock;
    findFirst: jest.Mock;
    create: jest.Mock;
    update: jest.Mock;
  };
  booking: { findUnique: jest.Mock };
  paymentWebhookEvent: { findUnique: jest.Mock; create: jest.Mock; update: jest.Mock };
};

describe('Real Razorpay QR code payment flow (replaces the fake decorative QR screen)', () => {
  const bookingId = 'booking-qr-1';
  const customerId = 'cust-qr-1';
  const driverProfileId = 'driver-qr-1';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('createUpiQrPaymentForBooking', () => {
    it('creates a real Payment row and a real Razorpay QR code, never a fabricated VPA', async () => {
      mockedPrisma.booking.findUnique.mockResolvedValue({
        id: bookingId,
        customerId,
        driverProfileId,
        status: 'TRIP_COMPLETED',
        discountAmount: null,
        promotionId: null,
        promotionCodeSnapshot: null,
      });
      mockedPrisma.payment.findFirst.mockResolvedValue(null);
      mockedPrisma.payment.create.mockResolvedValue({
        id: 'pay-qr-1',
        amount: new Prisma.Decimal('200.0000'),
        currency: 'INR',
      });
      (paymentProvider.createUpiQrCode as jest.Mock).mockResolvedValue({
        providerQrCodeId: 'qr_live_xyz',
        imageUrl: 'https://rzp.io/i/real-qr',
        status: 'active',
      });
      mockTx.payment.update.mockResolvedValue({
        id: 'pay-qr-1',
        amount: new Prisma.Decimal('200.0000'),
        currency: 'INR',
      });

      const result = await createUpiQrPaymentForBooking(driverProfileId, bookingId);

      expect(paymentProvider.createUpiQrCode).toHaveBeenCalledWith(
        expect.objectContaining({ amountMinorUnits: 20000 }),
      );
      expect(result.qrCodeImageUrl).toBe('https://rzp.io/i/real-qr');
      expect(mockedPrisma.payment.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ provider: 'razorpay', paymentMethod: 'QR' }),
        }),
      );
    });

    it('is idempotent — a second call while a QR code already exists reuses it instead of minting a duplicate', async () => {
      mockedPrisma.booking.findUnique.mockResolvedValue({
        id: bookingId,
        customerId,
        driverProfileId,
        status: 'TRIP_COMPLETED',
        discountAmount: null,
      });
      mockedPrisma.payment.findFirst.mockResolvedValue({
        id: 'pay-qr-existing',
        paymentMethod: 'QR',
        qrCodeImageUrl: 'https://rzp.io/i/already-generated',
        amount: new Prisma.Decimal('200.0000'),
        currency: 'INR',
      });

      const result = await createUpiQrPaymentForBooking(driverProfileId, bookingId);

      expect(result.qrCodeImageUrl).toBe('https://rzp.io/i/already-generated');
      expect(paymentProvider.createUpiQrCode).not.toHaveBeenCalled();
      expect(mockedPrisma.payment.create).not.toHaveBeenCalled();
    });

    it('rejects when a cash or online payment is already active for this booking — never a competing payment method', async () => {
      mockedPrisma.booking.findUnique.mockResolvedValue({
        id: bookingId,
        customerId,
        driverProfileId,
        status: 'TRIP_COMPLETED',
        discountAmount: null,
      });
      mockedPrisma.payment.findFirst.mockResolvedValue({
        id: 'pay-cash-active',
        paymentMethod: 'CASH',
        status: 'PROCESSING',
      });

      await expect(createUpiQrPaymentForBooking(driverProfileId, bookingId)).rejects.toThrow(
        PaymentAlreadyInProgressError,
      );
      expect(paymentProvider.createUpiQrCode).not.toHaveBeenCalled();
    });

    it('marks the payment FAILED and rethrows when Razorpay rejects the QR code request', async () => {
      mockedPrisma.booking.findUnique.mockResolvedValue({
        id: bookingId,
        customerId,
        driverProfileId,
        status: 'TRIP_COMPLETED',
        discountAmount: null,
      });
      mockedPrisma.payment.findFirst.mockResolvedValue(null);
      mockedPrisma.payment.create.mockResolvedValue({
        id: 'pay-qr-fail',
        amount: new Prisma.Decimal('200.0000'),
        currency: 'INR',
      });
      (paymentProvider.createUpiQrCode as jest.Mock).mockRejectedValue(new Error('Razorpay down'));

      await expect(createUpiQrPaymentForBooking(driverProfileId, bookingId)).rejects.toThrow(
        PaymentProviderError,
      );
      expect(mockedPrisma.payment.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ status: 'FAILED' }) }),
      );
    });

    it('rejects a driver who is not assigned to the booking', async () => {
      mockedPrisma.booking.findUnique.mockResolvedValue({
        id: bookingId,
        customerId,
        driverProfileId: 'someone-else',
        status: 'TRIP_COMPLETED',
      });

      await expect(createUpiQrPaymentForBooking(driverProfileId, bookingId)).rejects.toThrow(
        CashPaymentConfirmationForbiddenError,
      );
    });

    it('rejects a booking that is not yet in a payable state', async () => {
      mockedPrisma.booking.findUnique.mockResolvedValue({
        id: bookingId,
        customerId,
        driverProfileId,
        status: 'SEARCHING_DRIVER',
      });

      await expect(createUpiQrPaymentForBooking(driverProfileId, bookingId)).rejects.toThrow(
        BookingNotEligibleForPaymentError,
      );
    });
  });

  describe('qr_code.credited webhook', () => {
    it('finds the Payment by the stored QR code id and finalizes it through the real capture path', async () => {
      const rawBody = JSON.stringify({
        event: 'qr_code.credited',
        payload: {
          qr_code: { entity: { id: 'qr_live_xyz' } },
          payment: { entity: { id: 'pay_rzp_1', amount: 20000 } },
        },
      });

      (paymentProvider.verifyWebhookSignature as jest.Mock).mockReturnValue(true);
      mockedPrisma.paymentWebhookEvent.findUnique.mockResolvedValue(null);
      mockedPrisma.paymentWebhookEvent.create.mockResolvedValue({ id: 'evt-qr-1' });
      mockedPrisma.paymentWebhookEvent.update.mockResolvedValue({ id: 'evt-qr-1' });
      mockedPrisma.payment.findFirst.mockResolvedValue({
        id: 'pay-qr-1',
        providerOrderId: 'qr_live_xyz',
        paymentMethod: 'QR',
      });
      mockTx.payment.findUnique.mockResolvedValue({
        id: 'pay-qr-1',
        status: 'PROCESSING',
        amount: new Prisma.Decimal('200.0000'),
        discountAmount: null,
        driverProfileId,
        bookingId,
        provider: 'razorpay',
        providerOrderId: 'qr_live_xyz',
      });
      mockTx.payment.update.mockResolvedValue({
        id: 'pay-qr-1',
        status: 'CAPTURED',
        amount: new Prisma.Decimal('200.0000'),
        currency: 'INR',
        bookingId,
        customerId,
        driverProfileId,
        commissionAmount: new Prisma.Decimal('40.0000'),
        driverEarningsAmount: new Prisma.Decimal('160.0000'),
        discountAmount: null,
        createdAt: new Date(),
      });

      const result = await processRazorpayWebhook({
        rawBody,
        signatureHeader: 'valid_sig',
        eventIdHeader: 'evt_qr_1',
      });

      expect(result.outcome).toBe('processed');
      expect(mockedPrisma.payment.findFirst).toHaveBeenCalledWith({
        where: { providerOrderId: 'qr_live_xyz', paymentMethod: 'QR' },
      });
    });

    it('ignores a qr_code.credited event for a QR code this platform never created', async () => {
      const rawBody = JSON.stringify({
        event: 'qr_code.credited',
        payload: {
          qr_code: { entity: { id: 'qr_unknown' } },
          payment: { entity: { id: 'pay_rzp_2', amount: 5000 } },
        },
      });

      (paymentProvider.verifyWebhookSignature as jest.Mock).mockReturnValue(true);
      mockedPrisma.paymentWebhookEvent.findUnique.mockResolvedValue(null);
      mockedPrisma.paymentWebhookEvent.create.mockResolvedValue({ id: 'evt-qr-2' });
      mockedPrisma.paymentWebhookEvent.update.mockResolvedValue({ id: 'evt-qr-2' });
      mockedPrisma.payment.findFirst.mockResolvedValue(null);

      const result = await processRazorpayWebhook({
        rawBody,
        signatureHeader: 'valid_sig',
        eventIdHeader: 'evt_qr_2',
      });

      expect(result.outcome).toBe('ignored');
    });
  });
});
