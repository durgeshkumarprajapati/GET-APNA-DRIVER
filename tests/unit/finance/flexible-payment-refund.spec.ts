import { Prisma } from '@prisma/client';
import {
  createPaymentForBooking,
  capturePayment,
} from '@/modules/finance/application/services/payment-service';
import { initiateRefund } from '@/modules/finance/application/services/refund-service';
import { cancelBooking } from '@/modules/booking/application/booking-service';
import { cancelBookingByOperator } from '@/modules/booking/application/dispatch-service';
import {
  BookingNotEligibleForPaymentError,
  PaymentAlreadyInProgressError,
} from '@/modules/finance/domain/errors';
import { paymentProvider } from '@/modules/finance/infrastructure/payment-provider';
import * as notificationService from '@/modules/notification/application/notification-service';
import { triggerImmediateOutboxDispatch } from '@/shared/outbox/outbox-service';

jest.mock('@/modules/notification/application/notification-service', () => ({
  createNotification: jest.fn().mockResolvedValue({ id: 'notif-1' }),
}));

jest.mock('@/shared/outbox/outbox-service', () => ({
  insertOutboxEvent: jest.fn(),
  triggerImmediateOutboxDispatch: jest.fn().mockResolvedValue(undefined),
}));

const mockTx = {
  payment: {
    findUnique: jest.fn(),
    findUniqueOrThrow: jest.fn(),
    findFirst: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  },
  booking: {
    findUnique: jest.fn(),
    findUniqueOrThrow: jest.fn(),
    update: jest.fn(),
  },
  refund: {
    findUnique: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  },
  paymentAttempt: {
    create: jest.fn(),
  },
  financialTransaction: {
    findUnique: jest.fn(),
    create: jest.fn(),
  },
  financialPosting: {
    createMany: jest.fn(),
  },
  ledgerAccount: {
    findUnique: jest.fn(),
  },
  // postFinancialTransaction (ledger-service.ts) writes one LedgerEntry row
  // per posting — financialPosting above is a vestige of an earlier,
  // buggy version of that function (see the comment in ledger-service.ts);
  // the real, current code path uses ledgerEntry.create exclusively. Both
  // capturePayment and initiateRefund go through it, so without this mock
  // every capture/refund test call throws
  // "Cannot read properties of undefined (reading 'create')" partway
  // through — silently, since both callers wrap the ledger-posting call in
  // a try/catch for unrelated reasons (best-effort notification, no-throw
  // cancellation), which masked this as "notification never fired" rather
  // than surfacing the real TypeError.
  ledgerEntry: {
    create: jest.fn(),
  },
  driverWallet: {
    findUnique: jest.fn(),
    upsert: jest.fn(),
    update: jest.fn(),
  },
  walletTransaction: {
    findUnique: jest.fn(),
    create: jest.fn(),
  },
  driverProfile: {
    update: jest.fn(),
  },
  bookingAssignmentAttempt: {
    updateMany: jest.fn(),
  },
  bookingLog: {
    create: jest.fn(),
  },
  outboxEvent: {
    create: jest.fn(),
  },
  auditLog: {
    create: jest.fn(),
  },
  configurationSetting: {
    findUnique: jest.fn(),
  },
};

jest.mock('@/shared/database/prisma', () => ({
  prisma: {
    $transaction: jest.fn((cb: (tx: unknown) => unknown) => cb(mockTx)),
    payment: {
      findUnique: (...args: unknown[]) => mockTx.payment.findUnique(...args),
      findUniqueOrThrow: (...args: unknown[]) => mockTx.payment.findUniqueOrThrow(...args),
      findFirst: (...args: unknown[]) => mockTx.payment.findFirst(...args),
      findMany: (...args: unknown[]) => mockTx.payment.findMany(...args),
      create: (...args: unknown[]) => mockTx.payment.create(...args),
      update: (...args: unknown[]) => mockTx.payment.update(...args),
    },
    booking: {
      findUnique: (...args: unknown[]) => mockTx.booking.findUnique(...args),
      findUniqueOrThrow: (...args: unknown[]) => mockTx.booking.findUniqueOrThrow(...args),
      update: (...args: unknown[]) => mockTx.booking.update(...args),
    },
    refund: {
      findUnique: (...args: unknown[]) => mockTx.refund.findUnique(...args),
      findMany: (...args: unknown[]) => mockTx.refund.findMany(...args),
      create: (...args: unknown[]) => mockTx.refund.create(...args),
      update: (...args: unknown[]) => mockTx.refund.update(...args),
    },
    driverProfile: {
      update: (...args: unknown[]) => mockTx.driverProfile.update(...args),
    },
    bookingAssignmentAttempt: {
      updateMany: (...args: unknown[]) => mockTx.bookingAssignmentAttempt.updateMany(...args),
    },
    bookingLog: {
      create: (...args: unknown[]) => mockTx.bookingLog.create(...args),
    },
    outboxEvent: {
      create: (...args: unknown[]) => mockTx.outboxEvent.create(...args),
    },
    auditLog: {
      create: (...args: unknown[]) => mockTx.auditLog.create(...args),
    },
    configurationSetting: {
      findUnique: (...args: unknown[]) => mockTx.configurationSetting.findUnique(...args),
    },
    ledgerEntry: {
      create: (...args: unknown[]) => mockTx.ledgerEntry.create(...args),
    },
    driverWallet: {
      findUnique: (...args: unknown[]) => mockTx.driverWallet.findUnique(...args),
      upsert: (...args: unknown[]) => mockTx.driverWallet.upsert(...args),
      update: (...args: unknown[]) => mockTx.driverWallet.update(...args),
    },
    walletTransaction: {
      findUnique: (...args: unknown[]) => mockTx.walletTransaction.findUnique(...args),
      create: (...args: unknown[]) => mockTx.walletTransaction.create(...args),
    },
  },
}));

jest.mock('@/modules/notification/application/notification-service', () => ({
  createNotification: jest.fn().mockResolvedValue({ id: 'notif-1' }),
}));

jest.mock('@/modules/driver/application/services/driver-eligibility-service', () => ({
  evaluateDriverEligibility: jest.fn().mockResolvedValue({ isEligible: true }),
}));

jest.mock('@/modules/location/application/driver-location-service', () => ({
  addDriverToLiveIndex: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('@/modules/tax-invoices/invoice-service', () => ({
  createTaxInvoiceForBooking: jest.fn().mockResolvedValue({ id: 'inv-1' }),
}));

describe('Phase 69: Flexible Customer Payment & Automatic Refund on Cancellation', () => {
  const customerId = 'cust-101';
  const driverProfileId = 'driver-prof-202';
  const driverUserId = 'driver-user-303';
  const bookingId = 'bk-flexible-999';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('1. Flexible Payment Timing', () => {
    it('allows payment creation when booking is in DRIVER_ASSIGNED state', async () => {
      mockTx.payment.findUnique.mockResolvedValue(null);
      mockTx.booking.findUnique.mockResolvedValue({
        id: bookingId,
        customerId,
        driverProfileId,
        status: 'DRIVER_ASSIGNED',
        estimatedFareAmount: new Prisma.Decimal(500),
        discountAmount: null,
      });
      mockTx.payment.findFirst.mockResolvedValue(null);
      mockTx.payment.create.mockResolvedValue({
        id: 'pay-1',
        bookingId,
        customerId,
        driverProfileId,
        amount: new Prisma.Decimal(500),
        currency: 'INR',
        status: 'CREATED',
        provider: 'razorpay',
        paymentMethod: 'ONLINE',
      });
      jest.spyOn(paymentProvider, 'createOrder').mockResolvedValue({
        providerOrderId: 'order_test_123',
        amountMinorUnits: 50000,
        currency: 'INR',
        status: 'created',
      });
      mockTx.payment.update.mockResolvedValue({
        id: 'pay-1',
        bookingId,
        customerId,
        driverProfileId,
        amount: new Prisma.Decimal(500),
        currency: 'INR',
        status: 'PROCESSING',
        provider: 'razorpay',
        providerOrderId: 'order_test_123',
        paymentMethod: 'ONLINE',
      });
      mockTx.paymentAttempt.create.mockResolvedValue({});
      mockTx.outboxEvent.create.mockResolvedValue({});

      const checkout = await createPaymentForBooking(customerId, {
        bookingId,
        paymentMethod: 'ONLINE',
      });

      expect(checkout.providerOrderId).toBe('order_test_123');
      expect(checkout.paymentId).toBe('pay-1');
    });

    it('allows payment creation when booking is in TRIP_IN_PROGRESS state before completion', async () => {
      mockTx.payment.findUnique.mockResolvedValue(null);
      mockTx.booking.findUnique.mockResolvedValue({
        id: bookingId,
        customerId,
        driverProfileId,
        status: 'TRIP_IN_PROGRESS',
        estimatedFareAmount: new Prisma.Decimal(750),
        discountAmount: null,
      });
      mockTx.payment.findFirst.mockResolvedValue(null);
      mockTx.payment.create.mockResolvedValue({
        id: 'pay-2',
        bookingId,
        customerId,
        driverProfileId,
        amount: new Prisma.Decimal(750),
        currency: 'INR',
        status: 'CREATED',
        provider: 'razorpay',
        paymentMethod: 'ONLINE',
      });
      jest.spyOn(paymentProvider, 'createOrder').mockResolvedValue({
        providerOrderId: 'order_test_456',
        amountMinorUnits: 75000,
        currency: 'INR',
        status: 'created',
      });
      mockTx.payment.update.mockResolvedValue({
        id: 'pay-2',
        bookingId,
        customerId,
        driverProfileId,
        amount: new Prisma.Decimal(750),
        currency: 'INR',
        status: 'PROCESSING',
        provider: 'razorpay',
        providerOrderId: 'order_test_456',
        paymentMethod: 'ONLINE',
      });
      mockTx.paymentAttempt.create.mockResolvedValue({});
      mockTx.outboxEvent.create.mockResolvedValue({});

      const checkout = await createPaymentForBooking(customerId, {
        bookingId,
        paymentMethod: 'ONLINE',
      });

      expect(checkout.providerOrderId).toBe('order_test_456');
    });

    it('rejects payment creation when booking is in SEARCHING_DRIVER state', async () => {
      mockTx.booking.findUnique.mockResolvedValue({
        id: bookingId,
        customerId,
        status: 'SEARCHING_DRIVER',
      });

      await expect(createPaymentForBooking(customerId, { bookingId })).rejects.toThrow(
        BookingNotEligibleForPaymentError,
      );
    });

    it('rejects payment creation when booking is CANCELLED', async () => {
      mockTx.booking.findUnique.mockResolvedValue({
        id: bookingId,
        customerId,
        status: 'CANCELLED',
      });

      await expect(createPaymentForBooking(customerId, { bookingId })).rejects.toThrow(
        BookingNotEligibleForPaymentError,
      );
    });

    it('prevents duplicate active payment creation', async () => {
      mockTx.booking.findUnique.mockResolvedValue({
        id: bookingId,
        customerId,
        status: 'DRIVER_ASSIGNED',
      });
      mockTx.payment.findFirst.mockResolvedValue({
        id: 'pay-existing',
        status: 'PROCESSING',
      });

      await expect(createPaymentForBooking(customerId, { bookingId })).rejects.toThrow(
        PaymentAlreadyInProgressError,
      );
    });
  });

  describe('2. Driver Notification on Payment Capture', () => {
    it('notifies assigned driver when payment is captured', async () => {
      const mockPayment = {
        id: 'pay-100',
        bookingId,
        customerId,
        driverProfileId,
        amount: new Prisma.Decimal(500),
        currency: 'INR',
        status: 'PROCESSING',
        provider: 'razorpay',
        paymentMethod: 'ONLINE',
        discountAmount: null,
        providerOrderId: 'ord-100',
        createdAt: new Date(),
      };
      mockTx.payment.findUnique.mockResolvedValue(mockPayment);
      mockTx.payment.update.mockResolvedValue({
        ...mockPayment,
        status: 'CAPTURED',
        providerPaymentId: 'pay_rzp_captured_1',
        capturedAt: new Date(),
      });
      mockTx.paymentAttempt.create.mockResolvedValue({});
      mockTx.financialTransaction.findUnique.mockResolvedValue(null);
      mockTx.financialTransaction.create.mockResolvedValue({ id: 'ft-100' });
      mockTx.ledgerAccount.findUnique.mockResolvedValue({ id: 'acc-1', code: '1000' });
      mockTx.financialPosting.createMany.mockResolvedValue({});
      mockTx.driverWallet.upsert.mockResolvedValue({
        id: 'wallet-1',
        driverProfileId,
        availableBalance: new Prisma.Decimal(0),
        pendingBalance: new Prisma.Decimal(0),
        reservedBalance: new Prisma.Decimal(0),
        totalEarned: new Prisma.Decimal(0),
        totalSettled: new Prisma.Decimal(0),
        currency: 'INR',
      });
      mockTx.walletTransaction.findUnique.mockResolvedValue(null);
      mockTx.walletTransaction.create.mockResolvedValue({ id: 'wtx-1' });
      mockTx.driverWallet.update.mockResolvedValue({});
      mockTx.auditLog.create.mockResolvedValue({});
      mockTx.outboxEvent.create.mockResolvedValue({});
      mockTx.booking.findUnique.mockResolvedValue({
        id: bookingId,
        driverProfile: { userId: driverUserId },
      });

      const summary = await capturePayment({
        paymentId: 'pay-100',
        providerPaymentId: 'pay_rzp_captured_1',
        amountMinorUnits: 50000,
        source: 'webhook',
      });

      expect(summary.status).toBe('CAPTURED');
      // Driver notification on payment capture is now delivered through the
      // outbox ('payment.captured' handler resolves the driver from
      // paymentId — see tests/unit/worker/notification-flow.spec.ts),
      // triggered immediately rather than via a direct createNotification
      // call here, so this only proves capturePayment wires that trigger in.
      expect(triggerImmediateOutboxDispatch).toHaveBeenCalled();
    });
  });

  describe('3. Automatic Refund on Booking Cancellation', () => {
    it('automatically initiates refund when a paid booking is cancelled by customer', async () => {
      mockTx.booking.findUnique.mockResolvedValue({
        id: bookingId,
        customerId,
        driverProfileId,
        status: 'DRIVER_ASSIGNED',
      });
      mockTx.configurationSetting.findUnique.mockResolvedValue(null);
      mockTx.booking.update.mockResolvedValue({});
      mockTx.bookingAssignmentAttempt.updateMany.mockResolvedValue({});
      mockTx.bookingLog.create.mockResolvedValue({});
      mockTx.driverProfile.update.mockResolvedValue({});
      mockTx.outboxEvent.create.mockResolvedValue({});
      mockTx.auditLog.create.mockResolvedValue({});
      mockTx.booking.findUniqueOrThrow.mockResolvedValue({
        id: bookingId,
        customerId,
        driverProfileId,
        status: 'CANCELLED',
      });

      // Captured payment exists for this booking
      mockTx.payment.findFirst.mockResolvedValue({
        id: 'pay-captured-1',
        bookingId,
        customerId,
        driverProfileId,
        amount: new Prisma.Decimal(500),
        currency: 'INR',
        status: 'CAPTURED',
        provider: 'razorpay',
        providerPaymentId: 'pay_rzp_live',
        capturedAt: new Date(),
        createdAt: new Date(),
      });
      mockTx.payment.findUnique.mockResolvedValue({
        id: 'pay-captured-1',
        bookingId,
        customerId,
        driverProfileId,
        amount: new Prisma.Decimal(500),
        currency: 'INR',
        status: 'CAPTURED',
        provider: 'razorpay',
        providerPaymentId: 'pay_rzp_live',
        capturedAt: new Date(),
        createdAt: new Date(),
      });
      // completeRefund (called synchronously once the provider confirms the
      // refund as 'processed', which this test's mock below does) reads the
      // payment via findUniqueOrThrow, not findUnique — a separate mock
      // method that must be set up independently.
      mockTx.payment.findUniqueOrThrow.mockResolvedValue({
        id: 'pay-captured-1',
        bookingId,
        customerId,
        driverProfileId,
        amount: new Prisma.Decimal(500),
        currency: 'INR',
        status: 'CAPTURED',
        provider: 'razorpay',
        providerPaymentId: 'pay_rzp_live',
        commissionPercentageSnapshot: new Prisma.Decimal(20),
        commissionAmount: new Prisma.Decimal(100),
        discountAmount: null,
        capturedAt: new Date(),
        createdAt: new Date(),
      });
      // findUnique is called twice for two different purposes here: once by
      // initiateRefund's idempotency check (by idempotencyKey — must be
      // null, there's no prior refund yet) and once by completeRefund
      // re-fetching the refund it needs to finalize (by id — must resolve
      // the just-created refund, in its pre-completion PENDING state, or
      // completeRefund throws RefundNotFoundError and the whole thing gets
      // silently swallowed by cancelBooking's catch, which is exactly what
      // made this failure look like "no notification" instead of the real
      // underlying error).
      mockTx.refund.findUnique.mockImplementation(({ where }: { where: Record<string, unknown> }) =>
        Promise.resolve(
          'id' in where
            ? {
                id: 'ref-1',
                paymentId: 'pay-captured-1',
                amount: new Prisma.Decimal(500),
                currency: 'INR',
                status: 'PENDING',
                reason: 'Cancelled by customer',
                createdAt: new Date(),
              }
            : null,
        ),
      );
      mockTx.refund.findMany.mockResolvedValue([]);
      mockTx.refund.create.mockResolvedValue({
        id: 'ref-1',
        paymentId: 'pay-captured-1',
        amount: new Prisma.Decimal(500),
        currency: 'INR',
        status: 'INITIATED',
        reason: 'Cancelled by customer',
        createdAt: new Date(),
      });
      jest.spyOn(paymentProvider, 'initiateRefund').mockResolvedValue({
        providerRefundId: 'rfnd_rzp_123',
        status: 'processed',
        amountMinorUnits: 50000,
      });
      mockTx.refund.update.mockResolvedValue({
        id: 'ref-1',
        paymentId: 'pay-captured-1',
        amount: new Prisma.Decimal(500),
        currency: 'INR',
        status: 'PROCESSED',
        reason: 'Cancelled by customer',
        processedAt: new Date(),
        createdAt: new Date(),
      });

      await cancelBooking(customerId, bookingId, 'Change of plans');

      expect(paymentProvider.initiateRefund).toHaveBeenCalled();
      expect(notificationService.createNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: customerId,
          type: 'PAYMENT_REFUNDED',
          title: 'Refund Initiated',
        }),
      );
    });

    it('does NOT trigger refund when cancelling an UNPAID booking', async () => {
      mockTx.booking.findUnique.mockResolvedValue({
        id: bookingId,
        customerId,
        driverProfileId,
        status: 'DRIVER_ASSIGNED',
      });
      mockTx.configurationSetting.findUnique.mockResolvedValue(null);
      mockTx.booking.update.mockResolvedValue({});
      mockTx.bookingAssignmentAttempt.updateMany.mockResolvedValue({});
      mockTx.bookingLog.create.mockResolvedValue({});
      mockTx.driverProfile.update.mockResolvedValue({});
      mockTx.outboxEvent.create.mockResolvedValue({});
      mockTx.auditLog.create.mockResolvedValue({});
      mockTx.booking.findUniqueOrThrow.mockResolvedValue({
        id: bookingId,
        customerId,
        driverProfileId,
        status: 'CANCELLED',
      });

      // No captured payment exists
      mockTx.payment.findFirst.mockResolvedValue(null);
      const initiateSpy = jest.spyOn(paymentProvider, 'initiateRefund');

      await cancelBooking(customerId, bookingId, 'Cancelled before paying');

      expect(initiateSpy).not.toHaveBeenCalled();
    });

    it('automatically initiates refund when operator/admin cancels a paid booking', async () => {
      mockTx.booking.findUnique.mockResolvedValue({
        id: bookingId,
        customerId,
        customer: { id: customerId, email: 'customer@example.com', phoneNumber: '9999999999' },
        status: 'DRIVER_ASSIGNED',
        assignmentAttempts: [],
      });
      mockTx.bookingAssignmentAttempt.updateMany.mockResolvedValue({});
      mockTx.driverProfile.update.mockResolvedValue({});
      mockTx.booking.update.mockResolvedValue({});
      mockTx.bookingLog.create.mockResolvedValue({});
      mockTx.outboxEvent.create.mockResolvedValue({});
      mockTx.auditLog.create.mockResolvedValue({});

      mockTx.payment.findFirst.mockResolvedValue({
        id: 'pay-captured-2',
        bookingId,
        customerId,
        driverProfileId,
        amount: new Prisma.Decimal(600),
        currency: 'INR',
        status: 'CAPTURED',
        provider: 'razorpay',
        providerPaymentId: 'pay_rzp_live_2',
        capturedAt: new Date(),
        createdAt: new Date(),
      });
      mockTx.payment.findUnique.mockResolvedValue({
        id: 'pay-captured-2',
        bookingId,
        customerId,
        driverProfileId,
        amount: new Prisma.Decimal(600),
        currency: 'INR',
        status: 'CAPTURED',
        provider: 'razorpay',
        providerPaymentId: 'pay_rzp_live_2',
        capturedAt: new Date(),
        createdAt: new Date(),
      });
      mockTx.refund.findUnique.mockResolvedValue(null);
      mockTx.refund.findMany.mockResolvedValue([]);
      mockTx.refund.create.mockResolvedValue({
        id: 'ref-2',
        paymentId: 'pay-captured-2',
        amount: new Prisma.Decimal(600),
        currency: 'INR',
        status: 'INITIATED',
        reason: 'Admin cancellation',
        createdAt: new Date(),
      });
      jest.spyOn(paymentProvider, 'initiateRefund').mockResolvedValue({
        providerRefundId: 'rfnd_rzp_456',
        status: 'processed',
        amountMinorUnits: 60000,
      });
      mockTx.refund.update.mockResolvedValue({
        id: 'ref-2',
        paymentId: 'pay-captured-2',
        amount: new Prisma.Decimal(600),
        currency: 'INR',
        status: 'PROCESSED',
        reason: 'Admin cancellation',
        processedAt: new Date(),
        createdAt: new Date(),
      });

      const operatorActor = {
        userId: 'admin-user-999',
        accountStatus: 'ACTIVE' as const,
        roles: ['ADMIN'],
        permissions: ['bookings.cancel'],
      };

      await cancelBookingByOperator({
        bookingId,
        actor: operatorActor,
        reason: 'Operational override',
      });

      expect(paymentProvider.initiateRefund).toHaveBeenCalled();
    });

    it('executes idempotent refund calls safely without duplicate refund records', async () => {
      mockTx.refund.findUnique.mockResolvedValue({
        id: 'ref-existing',
        paymentId: 'pay-1',
        amount: new Prisma.Decimal(500),
        currency: 'INR',
        status: 'PROCESSED',
        initiatedBy: customerId,
        reason: 'Existing refund',
        processedAt: new Date(),
        createdAt: new Date(),
      });

      const refund = await initiateRefund(customerId, {
        paymentId: 'pay-1',
        idempotencyKey: 'dup-refund-key',
      });

      expect(refund.id).toBe('ref-existing');
      expect(mockTx.refund.create).not.toHaveBeenCalled();
    });
  });
});
