import {
  getSmartBookingDefaults,
  getQuickRebookTemplates,
  calculateUpfrontSummary,
} from '@/modules/booking/application/smart-rebooking-service';

jest.mock('@/shared/database/prisma', () => ({
  prisma: {
    booking: {
      findMany: jest.fn().mockResolvedValue([
        {
          id: 'booking-recent-1',
          customerId: 'cust-101',
          bookingType: 'ONE_WAY',
          pickupAddress: 'Connaught Place, New Delhi',
          pickupLabel: 'Work',
          pickupLatitude: 28.6315,
          pickupLongitude: 77.2167,
          dropoffAddress: 'Cyber City, Gurugram',
          dropoffLabel: 'Office',
          dropoffLatitude: 28.495,
          dropoffLongitude: 77.089,
          vehicleCategory: 'SEDAN',
          status: 'TRIP_COMPLETED',
          finalFareAmount: 550,
          createdAt: new Date('2026-09-30T10:00:00Z'),
          serviceRecipient: { fullName: 'Mom', phone: '+919876543210' },
          driverProfile: { id: 'dp-1', displayName: 'Durgesh Prajapati' },
        },
      ]),
    },
    savedLocation: {
      findMany: jest.fn().mockResolvedValue([
        {
          id: 'loc-1',
          userId: 'cust-101',
          label: 'Home',
          addressLine1: 'Vasant Kunj',
          city: 'New Delhi',
          latitude: 28.52,
          longitude: 77.15,
          isDefault: true,
        },
        {
          id: 'loc-2',
          userId: 'cust-101',
          label: 'Office',
          addressLine1: 'Cyber City',
          city: 'Gurugram',
          latitude: 28.495,
          longitude: 77.089,
          isDefault: false,
        },
      ]),
    },
    customerPreference: {
      findUnique: jest.fn().mockResolvedValue({
        userId: 'cust-101',
        preferredVehicleCategory: 'SEDAN',
        defaultPaymentMethod: 'CASH',
      }),
    },
    customerSavedPerson: {
      findMany: jest.fn().mockResolvedValue([
        {
          id: 'person-1',
          customerId: 'cust-101',
          fullName: 'Mom',
          phone: '+919876543210',
          relationship: 'Mother',
          isActive: true,
        },
      ]),
      findUnique: jest.fn().mockResolvedValue({
        id: 'person-1',
        customerId: 'cust-101',
        fullName: 'Mom',
        phone: '+919876543210',
        relationship: 'Mother',
      }),
    },
    customerFavoriteDriver: {
      findMany: jest.fn().mockResolvedValue([
        {
          customerId: 'cust-101',
          driverProfileId: 'dp-1',
          driverProfile: { id: 'dp-1', displayName: 'Durgesh Prajapati' },
        },
      ]),
    },
    driverProfile: {
      findUnique: jest.fn().mockResolvedValue({
        id: 'dp-1',
        displayName: 'Durgesh Prajapati',
      }),
    },
  },
}));

describe('Phase 88 — Smart Rebooking & One-Tap Booking Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('getSmartBookingDefaults returns intelligent defaults based on customer history & saved data', async () => {
    const defaults = await getSmartBookingDefaults('cust-101');

    expect(defaults.hasPreviousBookings).toBe(true);
    expect(defaults.pickupLocation?.address).toBe('Connaught Place, New Delhi');
    expect(defaults.dropoffLocation?.address).toBe('Cyber City, Gurugram');
    expect(defaults.bookingType).toBe('ONE_WAY');
    expect(defaults.vehicleCategory).toBe('SEDAN');
    expect(defaults.savedPersonName).toBe('Mom');
    expect(defaults.preferredDriverId).toBe('dp-1');
  });

  it('getQuickRebookTemplates generates 1-tap rebook cards from completed trips & saved places', async () => {
    const cards = await getQuickRebookTemplates('cust-101');

    expect(cards.length).toBeGreaterThan(0);
    expect(cards[0].pickupLocation.address).toContain('Connaught Place');
    expect(cards[0].dropoffLocation?.address).toContain('Cyber City');
    expect(cards[0].estimatedFare).toBe(550);
  });

  it('calculateUpfrontSummary calculates upfront fare breakdown and service details', async () => {
    const summary = await calculateUpfrontSummary('cust-101', {
      pickupLocation: {
        address: 'Connaught Place, New Delhi',
        latitude: 28.6315,
        longitude: 77.2167,
      },
      dropoffLocation: {
        address: 'Cyber City, Gurugram',
        latitude: 28.495,
        longitude: 77.089,
      },
      bookingType: 'ONE_WAY',
      vehicleCategory: 'SEDAN',
      savedPersonId: 'person-1',
      preferredDriverId: 'dp-1',
    });

    expect(summary.bookingType).toBe('ONE_WAY');
    expect(summary.serviceRecipient.fullName).toBe('Mom');
    expect(summary.serviceRecipient.isForSomeoneElse).toBe(true);
    expect(summary.preferredDriver?.displayName).toBe('Durgesh Prajapati');
    expect(summary.paymentSummary.totalFare).toBeGreaterThan(0);
    expect(summary.paymentSummary.taxesAndFees).toBeGreaterThan(0);
  });
});
