import { createBooking } from '@/modules/booking/application/booking-service';
import { BookingType } from '@prisma/client';
import { prisma } from '@/shared/database/prisma';

jest.mock('@/shared/database/prisma', () => {
  const mockDb: any = {
    vehicleCategory: {
      findUnique: jest.fn(),
    },
    booking: {
      findUnique: jest.fn(),
      findUniqueOrThrow: jest.fn(),
      create: jest.fn(),
    },
    bookingLog: {
      create: jest.fn(),
    },
    promotionUsage: {
      findUnique: jest.fn().mockResolvedValue(null),
    },
    promotion: {
      findMany: jest.fn().mockResolvedValue([]),
    },
  };
  mockDb.$transaction = jest.fn((cb: (tx: unknown) => unknown) => cb(mockDb));
  return { prisma: mockDb };
});

jest.mock('@/shared/audit/audit-service', () => ({
  recordAuditLog: jest.fn(),
}));

jest.mock('@/shared/outbox/outbox-service', () => ({
  insertOutboxEvent: jest.fn(),
}));

jest.mock('@/modules/booking/application/matching-service', () => ({
  findAndOfferNextDriver: jest.fn().mockResolvedValue({ status: 'SEARCHING' }),
  findEligibleDrivers: jest.fn().mockResolvedValue([]),
  rankCandidateDrivers: jest.fn().mockResolvedValue([]),
}));

describe('Vehicle-Aware Booking Creation', () => {
  const mockPrisma = prisma as unknown as {
    vehicleCategory: { findUnique: jest.Mock };
    booking: { create: jest.Mock; findUniqueOrThrow: jest.Mock };
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('creates booking with explicit vehicleCategoryId when valid category is provided', async () => {
    mockPrisma.vehicleCategory.findUnique.mockResolvedValue({
      id: 'vc-suv',
      code: 'SUV',
      name: 'SUV',
      isActive: true,
    });
    const createdBooking = {
      id: 'b-suv-1',
      customerId: 'cust-1',
      bookingType: BookingType.POINT_TO_POINT,
      status: 'SEARCHING_DRIVER',
      vehicleCategoryId: 'vc-suv',
      vehicleCategory: { id: 'vc-suv', code: 'SUV', name: 'SUV' },
    };
    mockPrisma.booking.create.mockResolvedValue(createdBooking);
    mockPrisma.booking.findUniqueOrThrow.mockResolvedValue(createdBooking);

    const booking = await createBooking('cust-1', {
      pickupLocation: { address: 'Pickup', latitude: 12.9, longitude: 77.5 },
      dropoffLocation: { address: 'Dropoff', latitude: 12.95, longitude: 77.55 },
      bookingType: BookingType.POINT_TO_POINT,
      vehicleCategoryId: 'vc-suv',
    });

    expect(mockPrisma.vehicleCategory.findUnique).toHaveBeenCalledWith({ where: { id: 'vc-suv' } });
    expect(mockPrisma.booking.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          vehicleCategoryId: 'vc-suv',
        }),
      }),
    );
    expect(booking.vehicleCategoryId).toBe('vc-suv');
  });

  it('resolves vehicleCategoryCode to ID when code is provided', async () => {
    mockPrisma.vehicleCategory.findUnique.mockResolvedValue({
      id: 'vc-truck',
      code: 'TRUCK',
      name: 'Truck',
      isActive: true,
    });
    const createdBooking = {
      id: 'b-truck-1',
      customerId: 'cust-1',
      bookingType: BookingType.POINT_TO_POINT,
      status: 'SEARCHING_DRIVER',
      vehicleCategoryId: 'vc-truck',
      vehicleCategory: { id: 'vc-truck', code: 'TRUCK', name: 'Truck' },
    };
    mockPrisma.booking.create.mockResolvedValue(createdBooking);
    mockPrisma.booking.findUniqueOrThrow.mockResolvedValue(createdBooking);

    const booking = await createBooking('cust-1', {
      pickupLocation: { address: 'Pickup', latitude: 12.9, longitude: 77.5 },
      dropoffLocation: { address: 'Dropoff', latitude: 12.95, longitude: 77.55 },
      bookingType: BookingType.POINT_TO_POINT,
      vehicleCategoryCode: 'truck',
    });

    expect(mockPrisma.vehicleCategory.findUnique).toHaveBeenCalledWith({
      where: { code: 'TRUCK' },
    });
    expect(booking.vehicleCategoryId).toBe('vc-truck');
  });

  it('allows creating booking without vehicle category (backward compatible)', async () => {
    const createdBooking = {
      id: 'b-any-1',
      customerId: 'cust-1',
      bookingType: BookingType.POINT_TO_POINT,
      status: 'SEARCHING_DRIVER',
      vehicleCategoryId: null,
      vehicleCategory: null,
    };
    mockPrisma.booking.create.mockResolvedValue(createdBooking);
    mockPrisma.booking.findUniqueOrThrow.mockResolvedValue(createdBooking);

    const booking = await createBooking('cust-1', {
      pickupLocation: { address: 'Pickup', latitude: 12.9, longitude: 77.5 },
      dropoffLocation: { address: 'Dropoff', latitude: 12.95, longitude: 77.55 },
      bookingType: BookingType.POINT_TO_POINT,
    });

    expect(mockPrisma.vehicleCategory.findUnique).not.toHaveBeenCalled();
    expect(mockPrisma.booking.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          vehicleCategoryId: null,
        }),
      }),
    );
    expect(booking.vehicleCategoryId).toBeNull();
  });

  it('throws error when vehicle category is inactive or invalid', async () => {
    mockPrisma.vehicleCategory.findUnique.mockResolvedValue(null);

    await expect(
      createBooking('cust-1', {
        pickupLocation: { address: 'Pickup', latitude: 12.9, longitude: 77.5 },
        dropoffLocation: { address: 'Dropoff', latitude: 12.95, longitude: 77.55 },
        bookingType: BookingType.POINT_TO_POINT,
        vehicleCategoryId: 'vc-invalid',
      }),
    ).rejects.toThrow("Invalid or inactive vehicle category selection: 'vc-invalid'.");
  });
});
