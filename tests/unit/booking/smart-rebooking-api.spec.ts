import { GET as getSmartRebookingRoute } from '@/app/api/customer/smart-rebooking/route';
import { POST as estimateRoute } from '@/app/api/customer/smart-rebooking/estimate/route';
import { POST as oneTapRoute } from '@/app/api/customer/smart-rebooking/one-tap/route';
import { NextRequest } from 'next/server';

jest.mock('@/modules/identity/authorization/route-guard', () => ({
  withPermission: (permission: string, handler: any) => {
    return (req: any, context?: any, routeContext?: any) => {
      const principal = {
        userId: 'cust-101',
        roles: ['CUSTOMER'],
        permissions: [permission],
      };
      return handler(req, { principal, ...context }, routeContext);
    };
  },
}));

jest.mock('@/modules/booking/application/smart-rebooking-service', () => ({
  getSmartBookingDefaults: jest.fn().mockResolvedValue({
    pickupLocation: { address: 'Connaught Place', latitude: 28.63, longitude: 77.21 },
    dropoffLocation: { address: 'Cyber City', latitude: 28.49, longitude: 77.08 },
    bookingType: 'ONE_WAY',
    vehicleCategory: 'SEDAN',
    paymentMethod: 'CASH',
    hasPreviousBookings: true,
  }),
  getQuickRebookTemplates: jest.fn().mockResolvedValue([
    {
      id: 'card-1',
      title: 'Work Trip',
      subtitle: 'Connaught Place to Cyber City',
      bookingType: 'ONE_WAY',
      pickupLocation: { address: 'Connaught Place', latitude: 28.63, longitude: 77.21 },
      dropoffLocation: { address: 'Cyber City', latitude: 28.49, longitude: 77.08 },
      vehicleCategory: 'SEDAN',
      estimatedFare: 450,
    },
  ]),
  calculateUpfrontSummary: jest.fn().mockResolvedValue({
    bookingType: 'ONE_WAY',
    pickupLocation: { address: 'Connaught Place', latitude: 28.63, longitude: 77.21 },
    dropoffLocation: { address: 'Cyber City', latitude: 28.49, longitude: 77.08 },
    vehicleCategory: 'SEDAN',
    serviceRecipient: { fullName: 'You', isForSomeoneElse: false },
    paymentSummary: {
      baseFare: 350,
      distanceFare: 100,
      durationFare: 0,
      taxesAndFees: 81,
      totalFare: 531,
      estimatedDistanceKm: 15,
      estimatedDurationMinutes: 35,
      paymentMethod: 'CASH',
    },
  }),
}));

jest.mock('@/modules/booking/application/booking-service', () => ({
  createBooking: jest.fn().mockResolvedValue({
    id: 'booking-one-tap-1',
    status: 'SEARCHING_DRIVER',
    pickupAddress: 'Connaught Place',
    dropoffAddress: 'Cyber City',
  }),
}));

describe('Phase 88 — Smart Rebooking API Endpoints', () => {
  it('GET /api/customer/smart-rebooking returns defaults & quick rebook cards', async () => {
    const req = new NextRequest('http://localhost:3000/api/customer/smart-rebooking');
    const res = await getSmartRebookingRoute(req, {} as any);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.defaults).toBeDefined();
    expect(body.quickRebookCards.length).toBe(1);
  });

  it('POST /api/customer/smart-rebooking/estimate calculates upfront summary', async () => {
    const req = new NextRequest('http://localhost:3000/api/customer/smart-rebooking/estimate', {
      method: 'POST',
      body: JSON.stringify({
        pickupLocation: { address: 'Connaught Place', latitude: 28.63, longitude: 77.21 },
        dropoffLocation: { address: 'Cyber City', latitude: 28.49, longitude: 77.08 },
        bookingType: 'ONE_WAY',
      }),
    });

    const res = await estimateRoute(req, {} as any);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.upfrontSummary.paymentSummary.totalFare).toBe(531);
  });

  it('POST /api/customer/smart-rebooking/one-tap places 1-tap booking', async () => {
    const req = new NextRequest('http://localhost:3000/api/customer/smart-rebooking/one-tap', {
      method: 'POST',
      body: JSON.stringify({
        pickupLocation: { address: 'Connaught Place', latitude: 28.63, longitude: 77.21 },
        dropoffLocation: { address: 'Cyber City', latitude: 28.49, longitude: 77.08 },
        bookingType: 'ONE_WAY',
      }),
    });

    const res = await oneTapRoute(req, {} as any);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.booking.id).toBe('booking-one-tap-1');
  });
});
