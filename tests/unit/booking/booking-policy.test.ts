import { BookingType } from '@prisma/client';
import {
  isPointToPointBooking,
  isDriverHireBooking,
  supportsDropLocation,
  requiresDropLocation,
  requiresHireDuration,
  calculateHireEndTimestamp,
} from '@/modules/booking/domain/booking-policy';

describe('Phase 56 Booking Policy Unit Tests', () => {
  describe('isPointToPointBooking', () => {
    it('returns true for POINT_TO_POINT and ONE_WAY', () => {
      expect(isPointToPointBooking(BookingType.POINT_TO_POINT)).toBe(true);
      expect(isPointToPointBooking(BookingType.ONE_WAY)).toBe(true);
    });

    it('returns false for driver hire modes', () => {
      expect(isPointToPointBooking(BookingType.HOURLY)).toBe(false);
      expect(isPointToPointBooking(BookingType.DAILY)).toBe(false);
      expect(isPointToPointBooking(BookingType.WEEKLY)).toBe(false);
      expect(isPointToPointBooking(BookingType.MONTHLY)).toBe(false);
    });
  });

  describe('isDriverHireBooking', () => {
    it('returns true for HOURLY, DAILY, WEEKLY, MONTHLY, FULL_DAY, MULTI_DAY', () => {
      expect(isDriverHireBooking(BookingType.HOURLY)).toBe(true);
      expect(isDriverHireBooking(BookingType.DAILY)).toBe(true);
      expect(isDriverHireBooking(BookingType.WEEKLY)).toBe(true);
      expect(isDriverHireBooking(BookingType.MONTHLY)).toBe(true);
      expect(isDriverHireBooking(BookingType.FULL_DAY)).toBe(true);
      expect(isDriverHireBooking(BookingType.MULTI_DAY)).toBe(true);
    });

    it('returns false for POINT_TO_POINT and ONE_WAY', () => {
      expect(isDriverHireBooking(BookingType.POINT_TO_POINT)).toBe(false);
      expect(isDriverHireBooking(BookingType.ONE_WAY)).toBe(false);
    });
  });

  describe('dropoff location rules', () => {
    it('supports drop location for POINT_TO_POINT and ONE_WAY and ROUND_TRIP', () => {
      expect(supportsDropLocation(BookingType.POINT_TO_POINT)).toBe(true);
      expect(supportsDropLocation(BookingType.ONE_WAY)).toBe(true);
      expect(supportsDropLocation(BookingType.ROUND_TRIP)).toBe(true);
    });

    it('does NOT support drop location for driver hire modes', () => {
      expect(supportsDropLocation(BookingType.HOURLY)).toBe(false);
      expect(supportsDropLocation(BookingType.DAILY)).toBe(false);
      expect(supportsDropLocation(BookingType.WEEKLY)).toBe(false);
      expect(supportsDropLocation(BookingType.MONTHLY)).toBe(false);
    });

    it('drop location is NEVER strictly required by default', () => {
      expect(requiresDropLocation(BookingType.POINT_TO_POINT)).toBe(false);
      expect(requiresDropLocation(BookingType.HOURLY)).toBe(false);
      expect(requiresDropLocation(BookingType.DAILY)).toBe(false);
    });
  });

  describe('requiresHireDuration', () => {
    it('requires duration for all hire modes', () => {
      expect(requiresHireDuration(BookingType.HOURLY)).toBe(true);
      expect(requiresHireDuration(BookingType.DAILY)).toBe(true);
      expect(requiresHireDuration(BookingType.WEEKLY)).toBe(true);
      expect(requiresHireDuration(BookingType.MONTHLY)).toBe(true);
    });

    it('does not require duration for point to point', () => {
      expect(requiresHireDuration(BookingType.POINT_TO_POINT)).toBe(false);
    });
  });

  describe('calculateHireEndTimestamp', () => {
    const baseStart = new Date('2026-09-20T10:00:00.000Z');

    it('calculates HOURLY end time correctly', () => {
      const end = calculateHireEndTimestamp(BookingType.HOURLY, 240, baseStart);
      expect(end.toISOString()).toBe('2026-09-20T14:00:00.000Z');
    });

    it('calculates DAILY end time correctly', () => {
      const end = calculateHireEndTimestamp(BookingType.DAILY, 1440, baseStart);
      expect(end.toISOString()).toBe('2026-09-21T10:00:00.000Z');
    });

    it('calculates WEEKLY end time correctly', () => {
      const end = calculateHireEndTimestamp(BookingType.WEEKLY, 10080, baseStart);
      expect(end.toISOString()).toBe('2026-09-27T10:00:00.000Z');
    });

    it('calculates MONTHLY end time correctly', () => {
      const end = calculateHireEndTimestamp(BookingType.MONTHLY, 43200, baseStart);
      expect(end.toISOString()).toBe('2026-10-20T10:00:00.000Z');
    });
  });
});
