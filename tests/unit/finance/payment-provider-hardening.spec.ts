import { Prisma } from '@prisma/client';

const mockTx = {
  payment: { findUnique: jest.fn(), update: jest.fn() },
  paymentAttempt: { create: jest.fn() },
};

jest.mock('@/shared/database/prisma', () => ({
  prisma: {
    $transaction: jest.fn((cb: (tx: unknown) => unknown) => cb(mockTx)),
    payment: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
    },
    paymentWebhookEvent: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    booking: {
      findUnique: jest.fn(),
    },
  },
}));

jest.mock('@/shared/audit/audit-service', () => ({
  recordAuditLog: jest.fn(),
}));

jest.mock('@/shared/outbox/outbox-service', () => ({
  insertOutboxEvent: jest.fn(),
}));

jest.mock('@/modules/finance/infrastructure/payment-provider', () => ({
  paymentProvider: {
    createOrder: jest.fn(),
    fetchPayment: jest.fn(),
    fetchOrder: jest.fn(),
    verifyPaymentSignature: jest.fn(),
    verifyWebhookSignature: jest.fn(),
  },
  MockPaymentProvider: jest.requireActual('@/modules/finance/infrastructure/payment-provider')
    .MockPaymentProvider,
}));

jest.mock('@/modules/finance/application/services/payment-service', () => ({
  capturePayment: jest.fn().mockResolvedValue({ id: 'payment-1', status: 'CAPTURED' }),
  markPaymentFailed: jest.fn().mockResolvedValue({ id: 'payment-1', status: 'FAILED' }),
}));

import {
  validatePaymentStatusTransition,
  isTerminalPaymentStatus,
} from '@/modules/finance/domain/payment-state-machine';
import { InvalidPaymentStatusTransitionError } from '@/modules/finance/domain/errors';
import { reconcileStuckPayments } from '@/modules/finance/application/services/payment-reconciliation-service';
import {
  paymentProvider,
  MockPaymentProvider,
} from '@/modules/finance/infrastructure/payment-provider';
import { prisma } from '@/shared/database/prisma';
import {
  capturePayment,
  markPaymentFailed,
} from '@/modules/finance/application/services/payment-service';

const mockedPrisma = prisma as unknown as {
  payment: {
    findMany: jest.Mock;
    findUnique: jest.Mock;
    findFirst: jest.Mock;
    update: jest.Mock;
  };
  paymentWebhookEvent: {
    findUnique: jest.Mock;
    create: jest.Mock;
    update: jest.Mock;
  };
};

const mockedProvider = paymentProvider as unknown as {
  fetchPayment: jest.Mock;
  fetchOrder: jest.Mock;
  verifyWebhookSignature: jest.Mock;
};

const mockedCapturePayment = capturePayment as unknown as jest.Mock;
const mockedMarkPaymentFailed = markPaymentFailed as unknown as jest.Mock;

describe('Phase 64 — Payment Provider & Settlement Hardening Unit Tests', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Payment State Machine', () => {
    it('allows valid state transitions', () => {
      expect(() => validatePaymentStatusTransition('CREATED', 'PROCESSING')).not.toThrow();
      expect(() => validatePaymentStatusTransition('PROCESSING', 'CAPTURED')).not.toThrow();
      expect(() => validatePaymentStatusTransition('PROCESSING', 'FAILED')).not.toThrow();
      expect(() => validatePaymentStatusTransition('CAPTURED', 'REFUNDED')).not.toThrow();
    });

    it('rejects invalid state transitions out of terminal states', () => {
      expect(() => validatePaymentStatusTransition('CAPTURED', 'PROCESSING')).toThrow(
        InvalidPaymentStatusTransitionError,
      );
      expect(() => validatePaymentStatusTransition('FAILED', 'CAPTURED')).toThrow(
        InvalidPaymentStatusTransitionError,
      );
      expect(() => validatePaymentStatusTransition('CANCELLED', 'CAPTURED')).toThrow(
        InvalidPaymentStatusTransitionError,
      );
    });

    it('identifies terminal statuses correctly', () => {
      expect(isTerminalPaymentStatus('FAILED')).toBe(true);
      expect(isTerminalPaymentStatus('CANCELLED')).toBe(true);
      expect(isTerminalPaymentStatus('REFUNDED')).toBe(true);
      expect(isTerminalPaymentStatus('PROCESSING')).toBe(false);
      expect(isTerminalPaymentStatus('CREATED')).toBe(false);
    });
  });

  describe('Payment Reconciliation Service', () => {
    it('reconciles stuck online payments reported as captured by provider', async () => {
      const fifteenMinsAgo = new Date(Date.now() - 20 * 60 * 1000);
      mockedPrisma.payment.findMany.mockResolvedValue([
        {
          id: 'pay-1',
          provider: 'razorpay',
          providerOrderId: 'order_123',
          providerPaymentId: 'pay_rzp_123',
          status: 'PROCESSING',
          amount: new Prisma.Decimal('100.0000'),
          createdAt: fifteenMinsAgo,
          updatedAt: fifteenMinsAgo,
        },
      ]);

      mockedProvider.fetchPayment.mockResolvedValue({
        providerPaymentId: 'pay_rzp_123',
        status: 'captured',
        amountMinorUnits: 10000,
        currency: 'INR',
      });

      const result = await reconcileStuckPayments(15);

      expect(result.inspected).toBe(1);
      expect(result.captured).toBe(1);
      expect(mockedCapturePayment).toHaveBeenCalledWith(
        expect.objectContaining({
          paymentId: 'pay-1',
          providerPaymentId: 'pay_rzp_123',
          source: 'webhook',
        }),
        expect.anything(),
      );
    });

    it('reconciles stuck online payments reported as failed by provider', async () => {
      const twentyMinsAgo = new Date(Date.now() - 20 * 60 * 1000);
      mockedPrisma.payment.findMany.mockResolvedValue([
        {
          id: 'pay-2',
          provider: 'razorpay',
          providerOrderId: 'order_456',
          providerPaymentId: 'pay_rzp_456',
          status: 'PROCESSING',
          amount: new Prisma.Decimal('200.0000'),
          createdAt: twentyMinsAgo,
          updatedAt: twentyMinsAgo,
        },
      ]);

      mockedProvider.fetchPayment.mockResolvedValue({
        providerPaymentId: 'pay_rzp_456',
        status: 'failed',
        amountMinorUnits: 20000,
        currency: 'INR',
      });

      const result = await reconcileStuckPayments(15);

      expect(result.inspected).toBe(1);
      expect(result.failed).toBe(1);
      expect(mockedMarkPaymentFailed).toHaveBeenCalledWith(
        'pay-2',
        expect.stringContaining('failed'),
        expect.anything(),
      );
    });

    it('expires cash payments stuck in PROCESSING older than 60 minutes', async () => {
      const seventyMinsAgo = new Date(Date.now() - 70 * 60 * 1000);
      mockedPrisma.payment.findMany.mockResolvedValue([
        {
          id: 'pay-cash-1',
          provider: 'cash',
          status: 'PROCESSING',
          createdAt: seventyMinsAgo,
          updatedAt: seventyMinsAgo,
        },
      ]);

      const result = await reconcileStuckPayments(15);

      expect(result.inspected).toBe(1);
      expect(result.failed).toBe(1);
      expect(mockedMarkPaymentFailed).toHaveBeenCalledWith(
        'pay-cash-1',
        'Cash confirmation expired (reconciled)',
        expect.anything(),
      );
    });
  });

  describe('MockPaymentProvider helper', () => {
    it('verifies mock checkout and webhook signatures correctly', () => {
      const mockProvider = new MockPaymentProvider();
      const orderId = 'order_test_123';
      const paymentId = 'pay_test_456';
      const signature = MockPaymentProvider.signMockCheckout(orderId, paymentId);

      expect(
        mockProvider.verifyPaymentSignature({
          providerOrderId: orderId,
          providerPaymentId: paymentId,
          signature,
        }),
      ).toBe(true);

      const rawBody = JSON.stringify({ event: 'payment.captured' });
      const webhookSig = MockPaymentProvider.signMockWebhook(rawBody);

      expect(mockProvider.verifyWebhookSignature(rawBody, webhookSig)).toBe(true);
    });
  });
});
