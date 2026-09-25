import { createBooking } from '@/modules/booking/application/booking-service';
import { prisma } from '@/shared/database/prisma';
import { BookingType } from '@prisma/client';
import {
  MockWhatsAppProvider,
  DevelopmentWhatsAppProvider,
  maskPhoneNumber,
} from '@/modules/notification/infrastructure/whatsapp-provider';

const mockTx = {
  booking: {
    create: jest.fn(),
    update: jest.fn(),
    findUnique: jest.fn(),
  },
  bookingServiceRecipient: {
    create: jest.fn(),
    findUnique: jest.fn(),
  },
  bookingLog: {
    create: jest.fn(),
  },
  bookingAssignmentAttempt: {
    updateMany: jest.fn(),
  },
  driverProfile: {
    update: jest.fn(),
  },
  outboxEvent: {
    create: jest.fn(),
  },
  promotionUsage: {
    findUnique: jest.fn().mockResolvedValue(null),
  },
  promotion: {
    findMany: jest.fn().mockResolvedValue([]),
  },
  auditLog: {
    create: jest.fn(),
  },
};

jest.mock('@/shared/database/prisma', () => ({
  prisma: {
    $transaction: jest.fn((cb: (tx: unknown) => unknown) => cb(mockTx)),
    booking: {
      findUnique: jest.fn(),
      findUniqueOrThrow: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    auditLog: {
      create: jest.fn(),
    },
    bookingServiceRecipient: {
      findUnique: jest.fn(),
    },
    customerFavoriteDriver: {
      findUnique: jest.fn(),
    },
    driverProfile: {
      findUnique: jest.fn(),
    },
  },
}));

describe('Phase 74 — Book Driver for Someone Else Unit Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('WhatsApp Provider Abstraction & Phone Masking', () => {
    it('correctly masks Indian and international phone numbers', () => {
      expect(maskPhoneNumber('+919876543210')).toBe('+919****10');
      expect(maskPhoneNumber('9876543210')).toBe('9876****10');
      expect(maskPhoneNumber('12345')).toBe('***');
    });

    it('records sent messages deterministically in MockWhatsAppProvider', async () => {
      const mockWa = new MockWhatsAppProvider();
      const result = await mockWa.sendMessage({
        toPhone: '+919876543210',
        textMessage: 'Hi Rajesh, your driver is en route.',
      });

      expect(result.status).toBe('delivered');
      expect(result.messageId).toContain('mock-wa');
      expect(mockWa.sentMessages).toHaveLength(1);
      expect(mockWa.getLastMessage('+919876543210')?.textMessage).toContain('en route');
    });

    it('logs to console gracefully in DevelopmentWhatsAppProvider', async () => {
      const devWa = new DevelopmentWhatsAppProvider();
      const spyLog = jest.spyOn(console, 'log').mockImplementation(() => {});

      const result = await devWa.sendMessage({
        toPhone: '+919876543210',
        textMessage: 'Dev test message',
      });

      expect(result.status).toBe('delivered');
      expect(spyLog).toHaveBeenCalled();
      spyLog.mockRestore();
    });
  });

  describe('Booking Service — Recipient Creation & Validation', () => {
    it('creates booking with serviceRecipient transactionally', async () => {
      const mockCreatedBooking = {
        id: 'booking_p74_100',
        customerId: 'customer_1',
        idempotencyKey: 'idemp-100',
        bookingType: BookingType.POINT_TO_POINT,
        status: 'SEARCHING_DRIVER',
        pickupLatitude: 28.6139,
        pickupLongitude: 77.209,
        pickupAddress: 'Connaught Place, New Delhi',
        pickupLabel: null,
        dropoffLatitude: 28.5355,
        dropoffLongitude: 77.391,
        dropoffAddress: 'Noida Sector 18',
        dropoffLabel: null,
        estimatedDistanceKm: 15,
        estimatedDurationMinutes: 35,
        totalFareAmount: 350,
        requestedAt: new Date(),
        expiresAt: new Date(),
        createdAt: new Date(),
      };

      const mockRecipient = {
        id: 'recipient_100',
        bookingId: 'booking_p74_100',
        fullName: 'Rajesh Sharma',
        phone: '+919876543210',
        relationship: 'Family',
        email: 'rajesh@example.com',
        notes: 'Call on arrival at Gate 4',
        notifyViaWhatsApp: true,
      };

      mockTx.booking.create.mockResolvedValue(mockCreatedBooking);
      mockTx.bookingServiceRecipient.create.mockResolvedValue(mockRecipient);
      (prisma.booking.findUniqueOrThrow as jest.Mock).mockResolvedValue({
        ...mockCreatedBooking,
        serviceRecipient: mockRecipient,
      });

      const result = await createBooking('customer_1', {
        bookingType: BookingType.POINT_TO_POINT,
        pickupLocation: {
          latitude: 28.6139,
          longitude: 77.209,
          address: 'Connaught Place, New Delhi',
          label: null,
        },
        dropoffLocation: {
          latitude: 28.5355,
          longitude: 77.391,
          address: 'Noida Sector 18',
          label: null,
        },
        serviceRecipient: {
          fullName: 'Rajesh Sharma',
          phone: '+919876543210',
          relationship: 'Family',
          email: 'rajesh@example.com',
          notes: 'Call on arrival at Gate 4',
          notifyViaWhatsApp: true,
        },
      });

      expect(mockTx.booking.create).toHaveBeenCalled();
      expect(mockTx.bookingServiceRecipient.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          bookingId: 'booking_p74_100',
          fullName: 'Rajesh Sharma',
          phone: '+919876543210',
          relationship: 'Family',
          notifyViaWhatsApp: true,
        }),
      });

      expect(result.isForSomeoneElse).toBe(true);
      expect(result.serviceRecipient?.fullName).toBe('Rajesh Sharma');
    });

    it('rejects invalid recipient mobile number format', async () => {
      await expect(
        createBooking('customer_1', {
          bookingType: BookingType.POINT_TO_POINT,
          pickupLocation: {
            latitude: 28.6139,
            longitude: 77.209,
            address: 'Connaught Place, New Delhi',
            label: null,
          },
          serviceRecipient: {
            fullName: 'Rajesh Sharma',
            phone: '123', // Invalid phone length
            notifyViaWhatsApp: true,
          },
        }),
      ).rejects.toThrow('Valid mobile number is required for the service recipient.');
    });

    it('rejects recipient missing fullName', async () => {
      await expect(
        createBooking('customer_1', {
          bookingType: BookingType.POINT_TO_POINT,
          pickupLocation: {
            latitude: 28.6139,
            longitude: 77.209,
            address: 'Connaught Place, New Delhi',
            label: null,
          },
          serviceRecipient: {
            fullName: '   ',
            phone: '+919876543210',
            notifyViaWhatsApp: true,
          },
        }),
      ).rejects.toThrow('Service recipient full name is required.');
    });
  });
});
