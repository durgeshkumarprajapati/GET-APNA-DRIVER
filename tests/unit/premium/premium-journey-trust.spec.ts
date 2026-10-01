jest.mock('@/modules/location/application/booking-location-service', () => ({
  getCustomerBookingLocationTelemetry: jest.fn(),
}));
jest.mock('@/modules/review/application/review-service', () => ({
  createReview: jest.fn(),
}));
jest.mock('@/modules/support/application/services/customer-support-service', () => ({
  createSupportTicket: jest.fn(),
}));

import type { Db } from '@/shared/database/prisma';
import {
  getPremiumJourneyTrustDetails,
  submitPostServiceFeedback,
} from '@/modules/customer/application/premium-journey-service';
import { BookingNotFoundError } from '@/modules/booking/domain/errors';
import { getCustomerBookingLocationTelemetry } from '@/modules/location/application/booking-location-service';
import { createReview } from '@/modules/review/application/review-service';
import { createSupportTicket } from '@/modules/support/application/services/customer-support-service';

const mockGetTelemetry = getCustomerBookingLocationTelemetry as jest.Mock;
const mockCreateReview = createReview as jest.Mock;
const mockCreateSupportTicket = createSupportTicket as jest.Mock;

describe('Phase 96 — Premium Journey & Trust Experience', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getPremiumJourneyTrustDetails', () => {
    it('builds the trust profile and fare breakdown from real fields only — nothing fabricated', async () => {
      const mockDb = {
        booking: {
          findFirst: jest.fn().mockResolvedValue({
            id: 'bkg-101',
            customerId: 'cust-101',
            status: 'TRIP_IN_PROGRESS',
            estimatedFareAmount: '400',
            finalFareAmount: '892',
            discountAmount: '0',
            pickupLatitude: 12.9,
            pickupLongitude: 77.5,
            dropoffLatitude: 12.95,
            dropoffLongitude: 77.6,
            pricingSnapshot: {
              breakdown: {
                baseFareAmount: '300.0000',
                distanceFareAmount: '400.0000',
                durationFareAmount: '100.0000',
                platformFeeAmount: '92.0000',
                totalFareAmount: '892.0000',
              },
            },
            driverProfile: {
              id: 'dp-55',
              displayName: 'Rajesh Kumar',
              firstName: 'Rajesh',
              lastName: 'Kumar',
              profileImageUrl: 'https://example.com/avatar.jpg',
              verificationStatus: 'VERIFIED',
              approvalStatus: 'APPROVED',
              ratingSummary: { averageRating: '4.95' },
            },
            payments: [{ paymentMethod: 'UPI', status: 'CAPTURED' }],
          }),
          count: jest.fn().mockResolvedValue(310),
        },
      } as unknown as Db;

      mockGetTelemetry.mockResolvedValue({
        driverLocation: { latitude: 12.92, longitude: 77.52, speed: 10, heading: 0, accuracy: 5, capturedAt: new Date() },
      });

      const details = await getPremiumJourneyTrustDetails('bkg-101', 'cust-101', mockDb);

      expect(details.bookingId).toBe('bkg-101');
      expect(details.driverTrustProfile?.fullName).toBe('Rajesh Kumar');
      expect(details.driverTrustProfile?.rating).toBe(4.95);
      expect(details.driverTrustProfile?.totalTripsCompleted).toBe(310);
      // Only real, earned badges — never a fixed claim of "Police Cleared"
      // regardless of actual verification status.
      expect(details.driverTrustProfile?.verificationBadges).toEqual([
        'Documents Verified',
        'Approved Partner',
      ]);
      expect(details.driverTrustProfile?.vehicle).toBeUndefined();
      expect(details.liveJourney.status).toBe('TRIP_IN_PROGRESS');
      expect(details.liveJourney.currentLatitude).toBe(12.92);
      expect(details.paymentRefund.totalFare).toBe(892);
      expect(details.paymentRefund.baseFare).toBe(300);
      expect(details.paymentRefund.paymentStatus).toBe('PAID');
    });

    it('does not claim verification badges for an unverified driver', async () => {
      const mockDb = {
        booking: {
          findFirst: jest.fn().mockResolvedValue({
            id: 'bkg-102',
            customerId: 'cust-101',
            status: 'DRIVER_EN_ROUTE',
            pickupLatitude: 12.9,
            pickupLongitude: 77.5,
            driverProfile: {
              id: 'dp-56',
              displayName: 'New Driver',
              verificationStatus: 'PENDING_VERIFICATION',
              approvalStatus: 'PENDING',
              ratingSummary: null,
            },
            payments: [],
          }),
          count: jest.fn().mockResolvedValue(0),
        },
      } as unknown as Db;
      mockGetTelemetry.mockResolvedValue({ driverLocation: null });

      const details = await getPremiumJourneyTrustDetails('bkg-102', 'cust-101', mockDb);

      expect(details.driverTrustProfile?.verificationBadges).toEqual([]);
      expect(details.driverTrustProfile?.rating).toBe(0);
    });

    it('throws BookingNotFoundError (maps to 404) when the booking does not exist or is not owned by this customer', async () => {
      const mockDb = {
        booking: { findFirst: jest.fn().mockResolvedValue(null) },
      } as unknown as Db;

      await expect(getPremiumJourneyTrustDetails('missing', 'cust-101', mockDb)).rejects.toBeInstanceOf(
        BookingNotFoundError,
      );
    });
  });

  describe('submitPostServiceFeedback', () => {
    it('records a real review and creates a real support ticket when an issue is reported', async () => {
      mockCreateReview.mockResolvedValue({ id: 'review-1' });
      mockCreateSupportTicket.mockResolvedValue({ ticketNumber: 'GAD-000123' });

      const feedback = await submitPostServiceFeedback(
        'bkg-101',
        'cust-101',
        {
          rating: 2,
          tipAmount: 0,
          issueCategory: 'UNSAFE_DRIVING',
          issueDetails: 'Driver was speeding in heavy rain',
        },
        {} as Db,
      );

      expect(mockCreateReview).toHaveBeenCalledWith(
        expect.objectContaining({ bookingId: 'bkg-101', customerUserId: 'cust-101', rating: 2 }),
        expect.anything(),
      );
      expect(mockCreateSupportTicket).toHaveBeenCalledWith(
        expect.objectContaining({ customerId: 'cust-101', bookingId: 'bkg-101', category: 'SAFETY_CONCERN' }),
        expect.anything(),
      );
      expect(feedback.feedbackId).toBe('review-1');
      expect(feedback.ratingRecorded).toBe(2);
      expect(feedback.issueTicketCreated).toBe(true);
      expect(feedback.ticketId).toBe('GAD-000123');
      expect(feedback.status).toBe('ESCALATED');
    });

    it('never reports a tip as processed — tipping is not implemented anywhere in this platform', async () => {
      mockCreateReview.mockResolvedValue({ id: 'review-2' });

      const feedback = await submitPostServiceFeedback(
        'bkg-101',
        'cust-101',
        { rating: 5, tipAmount: 100 },
        {} as Db,
      );

      expect(feedback.tipProcessedAmount).toBe(0);
      expect(feedback.resolutionSummary).not.toContain('successfully added');
      expect(mockCreateSupportTicket).not.toHaveBeenCalled();
    });
  });
});
