import { getCustomerDashboardData } from '@/modules/customer/application/customer-dashboard-service';

describe('Phase 79 — Intelligent Customer Dashboard & Personalized Experience', () => {
  const customerId = 'cust-uuid-7979';

  it('should assemble intelligent dashboard data with active service, recipient info, and billing alerts', async () => {
    const mockDb = {
      user: {
        findUnique: jest.fn().mockResolvedValue({
          id: customerId,
          createdAt: new Date('2026-01-01T00:00:00Z'),
          customerProfile: {
            firstName: 'Vikram',
            lastName: 'Singh',
            displayName: 'Vikram Singh',
          },
          credentials: {
            email: 'vikram@example.com',
            phoneNumber: '+919876543210',
          },
        }),
      },
      booking: {
        findFirst: jest
          .fn()
          // 1st call: Active booking
          .mockResolvedValueOnce({
            id: 'b-active-1',
            status: 'DRIVER_EN_ROUTE',
            bookingType: 'HOURLY',
            pickupAddress: 'Vasant Vihar, Delhi',
            dropoffAddress: 'Aerocity, Delhi',
            driverProfile: {
              id: 'd-101',
              displayName: 'Amit Sharma',
              ratingAverage: 4.9,
            },
            serviceRecipient: {
              fullName: 'Rahul Sharma',
              phone: '+91 98765 11111',
              relationship: 'Father',
            },
            requestedStartTime: new Date(),
          })
          // 2nd call: Upcoming booking
          .mockResolvedValueOnce({
            id: 'b-upcoming-1',
            status: 'SCHEDULED',
            bookingType: 'ONE_WAY',
            pickupAddress: 'Gurgaon Cyber City',
            requestedStartTime: new Date(Date.now() + 86400000),
            driverProfile: null,
            serviceRecipient: null,
          }),
        findMany: jest.fn().mockResolvedValue([
          {
            id: 'b-completed-1',
            status: 'TRIP_COMPLETED',
            bookingType: 'POINT_TO_POINT',
            pickupAddress: 'Connaught Place',
            finalFareAmount: 1200,
            createdAt: new Date('2026-09-24T10:00:00Z'),
            driverProfile: { displayName: 'Amit Sharma' },
            serviceRecipient: { fullName: 'Rahul Sharma' },
            payments: [{ amount: 1200 }],
          },
        ]),
      },
      customerSavedPerson: {
        findMany: jest.fn().mockResolvedValue([
          {
            id: 'sp-1',
            fullName: 'Rahul Sharma',
            phone: '+919876511111',
            relationship: 'Father',
          },
        ]),
      },
      savedLocation: {
        findMany: jest.fn().mockResolvedValue([
          {
            id: 'loc-1',
            label: 'Home',
            addressLine1: 'Villa 12, Vasant Vihar',
            city: 'Delhi',
            isDefault: true,
          },
        ]),
      },
      customerFavoriteDriver: {
        findMany: jest.fn().mockResolvedValue([
          {
            driverProfile: { id: 'd-101', displayName: 'Amit Sharma', ratingAverage: 4.9 },
          },
        ]),
      },
      customerPreference: {
        findUnique: jest.fn().mockResolvedValue({
          preferredVehicleCategory: 'LUXURY',
          preferredServiceType: 'HOURLY',
        }),
      },
      payment: {
        findMany: jest
          .fn()
          .mockResolvedValue([
            { id: 'pay-1', bookingId: 'b-active-1', amount: 1200, status: 'PENDING' },
          ]),
      },
      taxInvoice: {
        findFirst: jest.fn().mockResolvedValue({
          id: 'inv-1',
          invoiceNumber: 'GAD-INV-2026-0001',
          bookingId: 'b-completed-1',
        }),
      },
    } as unknown as Parameters<typeof getCustomerDashboardData>[1];

    const data = await getCustomerDashboardData(customerId, mockDb);

    // Profile assertion
    expect(data.profile.displayName).toBe('Vikram Singh');
    expect(data.profile.email).toBe('vikram@example.com');

    // Active Service assertion
    expect(data.activeService).not.toBeNull();
    expect(data.activeService?.id).toBe('b-active-1');
    expect(data.activeService?.status).toBe('DRIVER_EN_ROUTE');
    expect(data.activeService?.driver?.displayName).toBe('Amit Sharma');
    expect(data.activeService?.serviceRecipient?.isForSomeoneElse).toBe(true);
    expect(data.activeService?.serviceRecipient?.fullName).toBe('Rahul Sharma');

    // Upcoming Service assertion
    expect(data.upcomingService).not.toBeNull();
    expect(data.upcomingService?.id).toBe('b-upcoming-1');
    expect(data.upcomingService?.serviceRecipient?.isForSomeoneElse).toBe(false);

    // Saved People & Places shortcuts
    expect(data.savedPeople).toHaveLength(1);
    expect(data.savedPeople[0].fullName).toBe('Rahul Sharma');
    expect(data.savedPlaces).toHaveLength(1);
    expect(data.savedPlaces[0].label).toBe('Home');

    // Book Again shortcuts
    expect(data.bookAgainShortcuts).toHaveLength(1);
    expect(data.bookAgainShortcuts[0].id).toBe('b-completed-1');

    // Billing Summary
    expect(data.billingSummary.pendingPaymentsCount).toBe(1);
    expect(data.billingSummary.pendingPaymentsTotalAmount).toBe(1200);
    expect(data.billingSummary.latestInvoice?.invoiceNumber).toBe('GAD-INV-2026-0001');

    // Recommendations
    expect(data.recommendations.length).toBeGreaterThan(0);
    const payRec = data.recommendations.find((r) => r.category === 'BILLING');
    expect(payRec).toBeDefined();
    expect(payRec?.actionUrl).toBe('/payments/pay-1');
  });

  it('should strictly filter queries by customerId for IDOR protection', async () => {
    const mockDb = {
      user: {
        findUnique: jest.fn().mockResolvedValue({
          id: customerId,
          createdAt: new Date(),
          customerProfile: {},
          credentials: {},
        }),
      },
      booking: {
        findFirst: jest.fn().mockResolvedValue(null),
        findMany: jest.fn().mockResolvedValue([]),
      },
      customerSavedPerson: { findMany: jest.fn().mockResolvedValue([]) },
      savedLocation: { findMany: jest.fn().mockResolvedValue([]) },
      customerFavoriteDriver: { findMany: jest.fn().mockResolvedValue([]) },
      customerPreference: { findUnique: jest.fn().mockResolvedValue(null) },
      payment: { findMany: jest.fn().mockResolvedValue([]) },
      taxInvoice: { findFirst: jest.fn().mockResolvedValue(null) },
    };

    const dbArg = mockDb as unknown as Parameters<typeof getCustomerDashboardData>[1];
    await getCustomerDashboardData(customerId, dbArg);

    expect(mockDb.user.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: customerId } }),
    );
    expect(mockDb.booking.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ customerId }) }),
    );
    expect(mockDb.customerSavedPerson.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ customerId, isActive: true }) }),
    );
    expect(mockDb.savedLocation.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ userId: customerId }) }),
    );
  });
});
