import {
  getPremiumJourneyTrustDetails,
  submitPostServiceFeedback,
} from '@/modules/customer/application/premium-journey-service';

describe('Phase 96 — Premium Journey & Trust Experience', () => {
  it('retrieves live journey visualization, driver verification profile, and refund status', async () => {
    const mockDb: any = {
      booking: {
        findFirst: jest.fn().mockResolvedValue({
          id: 'bkg-101',
          customerId: 'cust-101',
          status: 'TRIP_IN_PROGRESS',
          estimatedFareAmount: '400',
          finalFareAmount: '892',
          driverProfile: {
            user: { id: 'drv-55', name: 'Rajesh Kumar' },
            avatarUrl: 'https://example.com/avatar.jpg',
            rating: '4.95',
            completedBookingsCount: 310,
            vehicleMake: 'Honda',
            vehicleModel: 'City',
            vehicleColor: 'White',
            vehicleNumber: 'KA-05-AB-1234',
          },
          payments: [
            {
              paymentMethod: 'UPI',
              status: 'PAID',
            },
          ],
        }),
      },
    };

    const details = await getPremiumJourneyTrustDetails('bkg-101', 'cust-101', mockDb);

    expect(details.bookingId).toBe('bkg-101');
    expect(details.driverTrustProfile?.fullName).toBe('Rajesh Kumar');
    expect(details.driverTrustProfile?.verificationBadges).toContain('Background Verified');
    expect(details.liveJourney.status).toBe('TRIP_IN_PROGRESS');
    expect(details.paymentRefund.totalFare).toBe(892);
  });

  it('submits feedback with tip and creates priority support ticket when issue reported', async () => {
    const mockDb: any = {};
    const feedback = await submitPostServiceFeedback(
      'bkg-101',
      'cust-101',
      {
        rating: 2,
        tipAmount: 0,
        issueCategory: 'UNSAFE_DRIVING',
        issueDetails: 'Driver was speeding in heavy rain',
      },
      mockDb,
    );

    expect(feedback.ratingRecorded).toBe(2);
    expect(feedback.issueTicketCreated).toBe(true);
    expect(feedback.ticketId).toBeDefined();
    expect(feedback.status).toBe('ESCALATED');
  });
});
