import { queryCustomerBookings } from '@/modules/booking/application/customer-booking-query-service';
import { BookingStatus, BookingType } from '@prisma/client';

describe('Phase 77 — Customer Service History & Booking Management Unit Tests', () => {
  describe('queryCustomerBookings Filters & Tabs', () => {
    it('should query bookings with IDOR protection enforcing customerId', async () => {
      const mockDb = {
        booking: {
          count: jest.fn().mockResolvedValue(2),
          findMany: jest.fn().mockResolvedValue([
            {
              id: 'b-101',
              status: BookingStatus.TRIP_COMPLETED,
              bookingType: BookingType.ONE_WAY,
              pickupLocationJson: { address: 'Delhi' },
              dropoffLocationJson: { address: 'Gurgaon' },
              createdAt: new Date('2026-09-25T10:00:00Z'),
              finalFareAmount: 1200,
              payments: [{ id: 'p-1', status: 'CAPTURED', amount: 1200, refunds: [] }],
              taxInvoice: { id: 'inv-1', invoiceNumber: 'GAD-INV-2026-000101' },
              review: { rating: 5, comment: 'Great driver!' },
            },
          ]),
        },
      } as unknown as Parameters<typeof queryCustomerBookings>[2];

      const result = await queryCustomerBookings(
        'customer-uuid-123',
        {
          statusTab: 'COMPLETED',
          page: 1,
          pageSize: 10,
        },
        mockDb,
      );

      expect(result.bookings).toHaveLength(1);
      expect(result.bookings[0].id).toBe('b-101');
      expect(result.bookings[0].status).toBe(BookingStatus.TRIP_COMPLETED);
      expect(result.bookings[0].isEligibleForBookAgain).toBe(true);
      expect(result.bookings[0].rating).toBe(5);
      expect(result.bookings[0].invoiceNumber).toBe('GAD-INV-2026-000101');
    });

    it('should correctly filter Phase 74 recipient details when booked for someone else', async () => {
      const mockDb = {
        booking: {
          count: jest.fn().mockResolvedValue(1),
          findMany: jest.fn().mockResolvedValue([
            {
              id: 'b-102',
              status: BookingStatus.DRIVER_ASSIGNED,
              bookingType: BookingType.MULTI_DAY,
              pickupLocationJson: { address: 'Ahmedabad' },
              createdAt: new Date('2026-09-25T11:00:00Z'),
              estimatedFareAmount: 2500,
              payments: [],
              serviceRecipient: {
                fullName: 'Rahul Sharma',
                phone: '+91 98765 43210',
                relationship: 'Friend',
              },
            },
          ]),
        },
      } as unknown as Parameters<typeof queryCustomerBookings>[2];

      const result = await queryCustomerBookings(
        'customer-uuid-123',
        {
          statusTab: 'UPCOMING',
        },
        mockDb,
      );

      expect(result.bookings[0].serviceRecipient?.isForSomeoneElse).toBe(true);
      expect(result.bookings[0].serviceRecipient?.fullName).toBe('Rahul Sharma');
      expect(result.bookings[0].serviceRecipient?.phone).toBe('+91 98765 43210');
      expect(result.bookings[0].isEligibleForBookAgain).toBe(false);
    });

    it('should aggregate tab counts for all, upcoming, active, completed, and cancelled services', async () => {
      const mockDb = {
        booking: {
          count: jest
            .fn()
            .mockResolvedValueOnce(10) // all
            .mockResolvedValueOnce(2) // upcoming
            .mockResolvedValueOnce(1) // active
            .mockResolvedValueOnce(5) // completed
            .mockResolvedValueOnce(2) // cancelled
            .mockResolvedValueOnce(10), // search query count
          findMany: jest.fn().mockResolvedValue([]),
        },
      } as unknown as Parameters<typeof queryCustomerBookings>[2];

      const result = await queryCustomerBookings('cust-1', {}, mockDb);

      expect(result.counts.all).toBe(10);
      expect(result.counts.upcoming).toBe(2);
      expect(result.counts.active).toBe(1);
      expect(result.counts.completed).toBe(5);
      expect(result.counts.cancelled).toBe(2);
    });
  });
});
