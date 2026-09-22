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
  },
}));

jest.mock('@/shared/config/configuration-service', () => ({
  getString: jest.fn().mockResolvedValue('INR'),
}));

jest.mock('@/shared/audit/audit-service', () => ({ recordAuditLog: jest.fn() }));
jest.mock('@/shared/outbox/outbox-service', () => ({ insertOutboxEvent: jest.fn(), triggerImmediateOutboxDispatch: jest.fn() }));

jest.mock('@/modules/finance/infrastructure/payment-provider', () => ({
  paymentProvider: {
    createOrder: jest.fn(),
    fetchPayment: jest.fn(),
    verifyPaymentSignature: jest.fn(),
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
  postFinancialTransaction: jest.fn().mockResolvedValue({ id: 'financial-txn-post-trip-1' }),
}));

jest.mock('@/modules/finance/application/services/wallet-service', () => ({
  applyWalletChange: jest.fn(),
}));

jest.mock('@/modules/tax-invoices/invoice-service', () => ({
  createTaxInvoiceForBooking: jest.fn().mockResolvedValue({ id: 'tax-invoice-1' }),
}));

import { Prisma } from '@prisma/client';
import {
  confirmCashPaymentByCustomer,
  confirmCashPaymentByDriver,
  getPostTripPaymentForBooking,
  createPaymentForBooking,
} from '@/modules/finance/application/services/payment-service';
import { prisma } from '@/shared/database/prisma';
import { applyWalletChange } from '@/modules/finance/application/services/wallet-service';
import { postFinancialTransaction } from '@/modules/finance/application/services/ledger-service';
import { triggerImmediateOutboxDispatch } from '@/shared/outbox/outbox-service';
import {
  BookingNotEligibleForPaymentError,
  CashPaymentConfirmationForbiddenError,
  PaymentBookingNotFoundError,
} from '@/modules/finance/domain/errors';

const mockedPrisma = prisma as unknown as {
  payment: {
    findUnique: jest.Mock;
    findFirst: jest.Mock;
    create: jest.Mock;
    update: jest.Mock;
  };
  booking: { findUnique: jest.Mock };
};

describe('Phase 63 — Post-Trip Driver Payment (UPI/QR & Cash)', () => {
  const customerId = 'cust-uuid-1';
  const driverProfileId = 'driver-prof-1';
  const bookingId = 'booking-uuid-1';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('createPaymentForBooking with payment method', () => {
    it('stores paymentMethod when creating a payment', async () => {
      mockedPrisma.payment.findUnique.mockResolvedValue(null);
      mockedPrisma.payment.findFirst.mockResolvedValue(null);
      mockedPrisma.booking.findUnique.mockResolvedValue({
        id: bookingId,
        customerId,
        driverProfileId,
        status: 'TRIP_COMPLETED',
        discountAmount: null,
      });

      const { paymentProvider } = jest.requireMock(
        '@/modules/finance/infrastructure/payment-provider',
      );
      paymentProvider.createOrder.mockResolvedValue({
        providerOrderId: 'order_razorpay_123',
      });

      mockedPrisma.payment.create.mockResolvedValue({
        id: 'pay-1',
        bookingId,
        customerId,
        driverProfileId,
        amount: new Prisma.Decimal('200.0000'),
        currency: 'INR',
        status: 'CREATED',
        provider: 'razorpay',
        paymentMethod: 'UPI',
        providerOrderId: null,
      });

      mockTx.payment.update.mockResolvedValue({
        id: 'pay-1',
        bookingId,
        customerId,
        amount: new Prisma.Decimal('200.0000'),
        currency: 'INR',
        status: 'PROCESSING',
        provider: 'razorpay',
        paymentMethod: 'UPI',
        providerOrderId: 'order_razorpay_123',
      });

      const checkout = await createPaymentForBooking(customerId, {
        bookingId,
        paymentMethod: 'UPI',
      });

      expect(checkout.providerOrderId).toBe('order_razorpay_123');
      expect(checkout.paymentMethod).toBe('UPI');
      expect(mockedPrisma.payment.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            paymentMethod: 'UPI',
          }),
        }),
      );
    });
  });

  describe('Cash Dual Confirmation Flow', () => {
    it('sets customer confirmation on cash payment', async () => {
      mockedPrisma.booking.findUnique.mockResolvedValue({
        id: bookingId,
        customerId,
        driverProfileId,
        status: 'TRIP_COMPLETED',
      });

      mockedPrisma.payment.findFirst.mockResolvedValue(null);
      mockedPrisma.payment.create.mockResolvedValue({
        id: 'pay-cash-1',
        bookingId,
        customerId,
        driverProfileId,
        amount: new Prisma.Decimal('200.0000'),
        currency: 'INR',
        status: 'PROCESSING',
        provider: 'cash',
        paymentMethod: 'CASH',
        cashCustomerConfirmedAt: new Date(),
        cashDriverConfirmedAt: null,
        promotionId: null,
        promotionCodeSnapshot: null,
        discountAmount: null,
        capturedAt: null,
        createdAt: new Date(),
      });

      const result = await confirmCashPaymentByCustomer(customerId, bookingId);

      expect(result.status).toBe('PROCESSING');
      expect(result.cashCustomerConfirmedAt).toBeDefined();
      expect(result.cashDriverConfirmedAt).toBeNull();
    });

    it('throws error if driver confirming cash is not assigned to booking', async () => {
      mockedPrisma.booking.findUnique.mockResolvedValue({
        id: bookingId,
        customerId,
        driverProfileId: 'other-driver-prof',
        status: 'TRIP_COMPLETED',
      });

      await expect(confirmCashPaymentByDriver(driverProfileId, bookingId)).rejects.toThrow(
        CashPaymentConfirmationForbiddenError,
      );
    });

    it('triggers payment capture when both customer and driver confirm cash payment', async () => {
      const now = new Date();
      mockedPrisma.booking.findUnique.mockResolvedValue({
        id: bookingId,
        customerId,
        driverProfileId,
        status: 'TRIP_COMPLETED',
        discountAmount: new Prisma.Decimal('50.0000'),
      });

      const existingCashPayment = {
        id: 'pay-cash-2',
        bookingId,
        customerId,
        driverProfileId,
        amount: new Prisma.Decimal('150.0000'),
        currency: 'INR',
        status: 'PROCESSING',
        provider: 'cash',
        paymentMethod: 'CASH',
        providerOrderId: 'CASH_booking-uuid-1',
        cashCustomerConfirmedAt: now,
        cashDriverConfirmedAt: null,
        promotionId: 'promo-1',
        promotionCodeSnapshot: 'SAVE50',
        discountAmount: new Prisma.Decimal('50.0000'),
        capturedAt: null,
        createdAt: now,
      };

      mockedPrisma.payment.findFirst.mockResolvedValue(existingCashPayment);
      mockedPrisma.payment.update.mockResolvedValue({
        ...existingCashPayment,
        cashDriverConfirmedAt: now,
      });

      mockTx.payment.findUnique.mockResolvedValue({
        ...existingCashPayment,
        cashDriverConfirmedAt: now,
      });

      mockTx.payment.update.mockResolvedValue({
        ...existingCashPayment,
        cashDriverConfirmedAt: now,
        status: 'CAPTURED',
        capturedAt: now,
        commissionAmount: new Prisma.Decimal('40.0000'),
        driverEarningsAmount: new Prisma.Decimal('160.0000'),
      });

      mockedPrisma.payment.findUnique.mockResolvedValue({
        ...existingCashPayment,
        cashDriverConfirmedAt: now,
        status: 'CAPTURED',
        capturedAt: now,
        commissionAmount: new Prisma.Decimal('40.0000'),
        driverEarningsAmount: new Prisma.Decimal('160.0000'),
      });

      const result = await confirmCashPaymentByDriver(driverProfileId, bookingId);

      expect(mockTx.payment.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ status: 'CAPTURED' }),
        }),
      );
      expect(postFinancialTransaction).toHaveBeenCalled();
      expect(applyWalletChange).toHaveBeenCalled();
      expect(result.status).toBe('CAPTURED');
      // Regression: the driver must be notified of the cash payment
      // immediately rather than only whenever the separate background
      // worker next polls.
      expect(triggerImmediateOutboxDispatch).toHaveBeenCalled();
    });

    it('rejects cash confirmation for cancelled trip', async () => {
      mockedPrisma.booking.findUnique.mockResolvedValue({
        id: bookingId,
        customerId,
        driverProfileId,
        status: 'CANCELLED',
      });

      await expect(confirmCashPaymentByCustomer(customerId, bookingId)).rejects.toThrow(
        BookingNotEligibleForPaymentError,
      );
    });
  });

  describe('getPostTripPaymentForBooking', () => {
    it('returns post-trip payment details and UPI QR payload', async () => {
      mockedPrisma.booking.findUnique.mockResolvedValue({
        id: bookingId,
        customerId,
        driverProfileId,
        status: 'TRIP_COMPLETED',
        discountAmount: new Prisma.Decimal('20.0000'),
      });

      mockedPrisma.payment.findFirst.mockResolvedValue({
        id: 'pay-details-1',
        bookingId,
        customerId,
        driverProfileId,
        amount: new Prisma.Decimal('180.0000'),
        currency: 'INR',
        status: 'PROCESSING',
        provider: 'cash',
        paymentMethod: 'CASH',
        providerOrderId: 'CASH_booking-uuid-1',
        cashCustomerConfirmedAt: new Date(),
        cashDriverConfirmedAt: null,
        capturedAt: null,
        discountAmount: new Prisma.Decimal('20.0000'),
        createdAt: new Date(),
      });

      const details = await getPostTripPaymentForBooking(bookingId);

      expect(details.bookingId).toBe(bookingId);
      expect(details.status).toBe('PROCESSING');
      expect(details.amount).toBe('180.0000');
      expect(details.grossAmount).toBe('200.0000');
      expect(details.discountAmount).toBe('20.0000');
      expect(details.upiQrPayload).toBeDefined();
      expect(details.upiQrPayload?.qrData).toContain('upi://pay');
    });

    it('throws error if booking does not exist', async () => {
      mockedPrisma.booking.findUnique.mockResolvedValue(null);

      await expect(getPostTripPaymentForBooking('non-existent')).rejects.toThrow(
        PaymentBookingNotFoundError,
      );
    });
  });
});
