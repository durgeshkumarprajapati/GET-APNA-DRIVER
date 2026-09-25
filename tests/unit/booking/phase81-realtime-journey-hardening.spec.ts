import { evaluateJourneyIntelligence } from '@/modules/booking/application/journey-intelligence-service';
import { sendBookingMessage } from '@/modules/booking/application/booking-messaging-service';
import { BookingStatus } from '@prisma/client';

describe('Phase 81 — Realtime Communication Hardening & Journey Intelligence', () => {
  describe('Explainable Journey Intelligence', () => {
    it('returns SEARCHING signal for SEARCHING_DRIVER booking status', () => {
      const result = evaluateJourneyIntelligence({
        bookingStatus: BookingStatus.SEARCHING_DRIVER,
      });
      expect(result.headline).toBe('Matching a top-rated driver');
      expect(result.statusSignal).toBe('SEARCHING');
    });

    it('returns APPROACHING signal when driver is within 500m of pickup', () => {
      const result = evaluateJourneyIntelligence({
        bookingStatus: BookingStatus.DRIVER_EN_ROUTE,
        distanceKm: 0.3,
        etaMinutes: 2,
        driverLocationUpdatedAt: new Date().toISOString(),
      });
      expect(result.headline).toBe('Your driver is approaching');
      expect(result.statusSignal).toBe('APPROACHING');
      expect(result.locationFreshness).toBe('FRESH');
    });

    it('returns DELAYED signal when ETA is greater than 15 minutes', () => {
      const result = evaluateJourneyIntelligence({
        bookingStatus: BookingStatus.DRIVER_EN_ROUTE,
        etaMinutes: 22,
        driverLocationUpdatedAt: new Date().toISOString(),
      });
      expect(result.headline).toBe('Arrival is taking longer than expected');
      expect(result.statusSignal).toBe('DELAYED');
    });

    it('detects STALE location when location timestamp is older than 30 seconds', () => {
      const staleDate = new Date(Date.now() - 45000).toISOString();
      const result = evaluateJourneyIntelligence({
        bookingStatus: BookingStatus.DRIVER_EN_ROUTE,
        driverLocationUpdatedAt: staleDate,
        etaMinutes: 5,
        distanceKm: 2,
      });
      expect(result.locationFreshness).toBe('STALE');
      expect(result.subtext).toBe('Location updating...');
    });

    it('returns ARRIVED signal for DRIVER_ARRIVED booking status', () => {
      const result = evaluateJourneyIntelligence({
        bookingStatus: BookingStatus.DRIVER_ARRIVED,
      });
      expect(result.headline).toBe('Your driver has arrived');
      expect(result.statusSignal).toBe('ARRIVED');
    });

    it('returns TRIP_STARTED signal for TRIP_IN_PROGRESS booking status', () => {
      const result = evaluateJourneyIntelligence({
        bookingStatus: BookingStatus.TRIP_IN_PROGRESS,
      });
      expect(result.headline).toBe('Your driver service has started');
      expect(result.statusSignal).toBe('TRIP_STARTED');
    });

    it('returns COMPLETED signal for TRIP_COMPLETED booking status', () => {
      const result = evaluateJourneyIntelligence({
        bookingStatus: BookingStatus.TRIP_COMPLETED,
      });
      expect(result.headline).toBe('Journey completed');
      expect(result.statusSignal).toBe('COMPLETED');
    });

    it('returns CANCELLED signal for CANCELLED booking status', () => {
      const result = evaluateJourneyIntelligence({
        bookingStatus: BookingStatus.CANCELLED,
      });
      expect(result.headline).toBe('Booking cancelled');
      expect(result.statusSignal).toBe('CANCELLED');
    });
  });

  describe('Message Send Idempotency', () => {
    it('prevents duplicate message creation when same idempotencyKey is supplied', async () => {
      const existingMsg = {
        id: 'msg-existing-1',
        bookingId: 'booking-idempotent-1',
        senderUserId: 'customer-user-1',
        senderRole: 'CUSTOMER',
        messageType: 'TEXT',
        body: 'I am at the pickup point',
        readAt: null,
        createdAt: new Date(),
      };

      const mockDb = {
        booking: {
          findUnique: jest.fn().mockResolvedValue({
            id: 'booking-idempotent-1',
            customerId: 'customer-user-1',
            driverProfileId: 'driver-prof-1',
            status: 'DRIVER_EN_ROUTE',
          }),
        },
        driverProfile: {
          findUnique: jest.fn().mockResolvedValue({
            userId: 'driver-user-1',
          }),
        },
        bookingAssignmentAttempt: {
          findFirst: jest.fn().mockResolvedValue({ id: 'attempt-1' }),
        },
        bookingMessage: {
          findFirst: jest.fn().mockResolvedValue(existingMsg),
          create: jest.fn(),
        },
        outboxEvent: {
          create: jest.fn(),
        },
      };

      const result = await sendBookingMessage(
        'customer-user-1',
        'booking-idempotent-1',
        'I am at the pickup point',
        { messageType: 'TEXT', idempotencyKey: 'idemp-key-999' },
        mockDb as any,
      );

      expect(result.id).toBe('msg-existing-1');
      expect(mockDb.bookingMessage.create).not.toHaveBeenCalled();
    });
  });
});
