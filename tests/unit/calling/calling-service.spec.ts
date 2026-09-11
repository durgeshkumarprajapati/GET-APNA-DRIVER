import { CallStatus, CallType } from '@prisma/client';
import { callingService, maskPhoneNumber } from '@/modules/calling/application/services/calling-service';
import { prisma } from '@/shared/database/prisma';
import { CallAuthorizationError } from '@/modules/calling/domain/errors';

jest.mock('@/shared/database/prisma', () => ({
  prisma: {
    booking: {
      findUnique: jest.fn(),
    },
    user: {
      findUnique: jest.fn(),
    },
    driverProfile: {
      findUnique: jest.fn(),
    },
    callSession: {
      create: jest.fn(),
      update: jest.fn(),
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
    },
    outboxEvent: {
      create: jest.fn(),
    },
  },
}));

describe('CallingService Unit Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('maskPhoneNumber helper', () => {
    it('masks phone numbers correctly leaving prefix and suffix', () => {
      expect(maskPhoneNumber('+919876543210')).toBe('+919****210');
      expect(maskPhoneNumber('+919999999999')).toBe('+919****999');
    });

    it('returns fallback for null or short numbers', () => {
      expect(maskPhoneNumber(null)).toBeNull();
      expect(maskPhoneNumber('1234')).toBe('***-***');
    });
  });

  describe('initiateCustomerToDriverCall', () => {
    it('throws error if booking does not exist', async () => {
      (prisma.booking.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(
        callingService.initiateCustomerToDriverCall('cust-1', 'booking-1'),
      ).rejects.toThrow(CallAuthorizationError);
    });

    it('throws error if booking belongs to another customer', async () => {
      (prisma.booking.findUnique as jest.Mock).mockResolvedValue({
        id: 'booking-1',
        customerId: 'cust-2',
      });

      await expect(
        callingService.initiateCustomerToDriverCall('cust-1', 'booking-1'),
      ).rejects.toThrow(CallAuthorizationError);
    });

    it('throws error if no driver assigned to booking', async () => {
      (prisma.booking.findUnique as jest.Mock).mockResolvedValue({
        id: 'booking-1',
        customerId: 'cust-1',
        driverProfileId: null,
      });

      await expect(
        callingService.initiateCustomerToDriverCall('cust-1', 'booking-1'),
      ).rejects.toThrow(CallAuthorizationError);
    });

    it('initiates proxy call successfully for active booking', async () => {
      const mockBooking = {
        id: 'booking-1',
        status: 'ACCEPTED',
        customerId: 'cust-1',
        driverProfileId: 'driver-prof-1',
        updatedAt: new Date(),
        customer: { id: 'cust-1', phone: '+919876543210' },
        driverProfile: {
          id: 'driver-prof-1',
          user: { id: 'driver-user-1', phone: '+919876543211' },
        },
      };

      (prisma.booking.findUnique as jest.Mock).mockResolvedValue(mockBooking);

      const mockSession = {
        id: 'session-1',
        provider: 'MOCK',
        providerCallId: 'mock_call_123',
        callType: CallType.CUSTOMER_TO_DRIVER,
        status: CallStatus.INITIATED,
        initiatedByUserId: 'cust-1',
        customerId: 'cust-1',
        driverProfileId: 'driver-prof-1',
        bookingId: 'booking-1',
        callerPhoneMasked: '+919****210',
        recipientPhoneMasked: '+919****211',
        startedAt: new Date(),
        answeredAt: null,
        endedAt: null,
        durationSeconds: null,
        failureReason: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      (prisma.callSession.create as jest.Mock).mockResolvedValue(mockSession);
      (prisma.callSession.update as jest.Mock).mockResolvedValue(mockSession);

      const result = await callingService.initiateCustomerToDriverCall('cust-1', 'booking-1');

      expect(result).toHaveProperty('callSessionId', 'session-1');
      expect(result.status).toBe(CallStatus.INITIATED);
      expect(result.callerPhoneMasked).toBe('+919****210');
      expect(result.recipientPhoneMasked).toBe('+919****211');
    });
  });

  describe('initiateSupportCall', () => {
    it('initiates support call for user', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue({
        id: 'cust-1',
        phone: '+919876543210',
        role: 'CUSTOMER',
      });

      const mockSession = {
        id: 'session-support-1',
        provider: 'MOCK',
        providerCallId: 'mock_support_123',
        callType: CallType.CUSTOMER_TO_SUPPORT,
        status: CallStatus.INITIATED,
        initiatedByUserId: 'cust-1',
        customerId: 'cust-1',
        driverProfileId: null,
        bookingId: null,
        supportTicketId: null,
        callerPhoneMasked: '+919****210',
        recipientPhoneMasked: '+911****000',
        startedAt: new Date(),
        answeredAt: null,
        endedAt: null,
        durationSeconds: null,
        failureReason: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      (prisma.callSession.create as jest.Mock).mockResolvedValue(mockSession);
      (prisma.callSession.update as jest.Mock).mockResolvedValue(mockSession);

      const result = await callingService.initiateSupportCall('cust-1');

      expect(result).toHaveProperty('callSessionId', 'session-support-1');
      expect(result.status).toBe(CallStatus.INITIATED);
    });
  });
});
