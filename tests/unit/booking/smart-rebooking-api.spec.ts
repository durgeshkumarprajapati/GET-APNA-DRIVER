import { NextRequest, type NextResponse } from 'next/server';
import type { AuthenticatedRouteHandler } from '@/modules/identity/authorization/route-guard';

jest.mock('@/modules/identity/authorization/route-guard', () => ({
  withPermission: <P>(permission: string, handler: AuthenticatedRouteHandler<P>) => {
    return (req: NextRequest, routeContext?: P): Promise<NextResponse> => {
      const principal = {
        userId: 'cust-101',
        accountStatus: 'ACTIVE' as const,
        roles: ['CUSTOMER'],
        permissions: [permission],
      };
      return handler(req, { principal }, routeContext);
    };
  },
}));

jest.mock('@/modules/booking/application/smart-rebooking-service', () => ({
  getSmartBookingDefaults: jest.fn().mockResolvedValue({
    pickupLocation: { address: 'Connaught Place', latitude: 28.63, longitude: 77.21 },
    dropoffLocation: { address: 'Cyber City', latitude: 28.49, longitude: 77.08 },
    bookingType: 'ONE_WAY',
    vehicleCategory: 'CAR',
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
      vehicleCategory: 'CAR',
      estimatedFare: 450,
    },
  ]),
  calculateUpfrontSummary: jest.fn().mockResolvedValue({
    bookingType: 'ONE_WAY',
    pickupLocation: { address: 'Connaught Place', latitude: 28.63, longitude: 77.21 },
    dropoffLocation: { address: 'Cyber City', latitude: 28.49, longitude: 77.08 },
    vehicleCategory: 'CAR',
    serviceRecipient: { fullName: 'You', isForSomeoneElse: false },
    paymentSummary: {
      baseFare: 350,
      distanceFare: 100,
      durationFare: 0,
      platformFee: 50,
      totalFare: 500,
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

import { GET as getSmartRebookingRoute } from '@/app/api/customer/smart-rebooking/route';
import { POST as estimateRoute } from '@/app/api/customer/smart-rebooking/estimate/route';
import { POST as oneTapRoute } from '@/app/api/customer/smart-rebooking/one-tap/route';
import { createBooking } from '@/modules/booking/application/booking-service';

const mockCreateBooking = createBooking as jest.Mock;

describe('Phase 88 — Smart Rebooking API Endpoints', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCreateBooking.mockResolvedValue({
      id: 'booking-one-tap-1',
      status: 'SEARCHING_DRIVER',
      pickupAddress: 'Connaught Place',
      dropoffAddress: 'Cyber City',
    });
  });

  it('GET /api/customer/smart-rebooking returns defaults & quick rebook cards', async () => {
    const req = new NextRequest('http://localhost:3000/api/customer/smart-rebooking');
    const res = await getSmartRebookingRoute(req, undefined);
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

    const res = await estimateRoute(req, undefined);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.upfrontSummary.paymentSummary.totalFare).toBe(500);
  });

  it("POST /api/customer/smart-rebooking/estimate accepts every real BookingType value, including ones a customer's smart defaults can produce (e.g. POINT_TO_POINT, FULL_DAY)", async () => {
    for (const bookingType of ['POINT_TO_POINT', 'FULL_DAY', 'MULTI_DAY']) {
      const req = new NextRequest('http://localhost:3000/api/customer/smart-rebooking/estimate', {
        method: 'POST',
        body: JSON.stringify({
          pickupLocation: { address: 'Connaught Place', latitude: 28.63, longitude: 77.21 },
          bookingType,
        }),
      });

      const res = await estimateRoute(req, undefined);
      expect(res.status).toBe(200);
    }
  });

  it('POST /api/customer/smart-rebooking/one-tap places 1-tap booking', async () => {
    const req = new NextRequest('http://localhost:3000/api/customer/smart-rebooking/one-tap', {
      method: 'POST',
      body: JSON.stringify({
        pickupLocation: { address: 'Connaught Place', latitude: 28.63, longitude: 77.21 },
        dropoffLocation: { address: 'Cyber City', latitude: 28.49, longitude: 77.08 },
        bookingType: 'ONE_WAY',
        idempotencyKey: 'client-generated-key-1',
      }),
    });

    const res = await oneTapRoute(req, undefined);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.booking.id).toBe('booking-one-tap-1');
    expect(mockCreateBooking).toHaveBeenCalledWith(
      'cust-101',
      expect.anything(),
      'client-generated-key-1',
    );
  });
});
