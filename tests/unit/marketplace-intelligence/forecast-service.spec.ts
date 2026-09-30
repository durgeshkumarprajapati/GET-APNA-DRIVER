// Mock Prisma
jest.mock('@/shared/database/prisma', () => ({
  prisma: {
    scheduledRide: {
      count: jest.fn(),
      findMany: jest.fn(),
    },
    booking: {
      count: jest.fn(),
      findMany: jest.fn(),
    },
    driverProfile: {
      findMany: jest.fn(),
    },
    driverCurrentLocation: {
      findMany: jest.fn().mockResolvedValue([]),
    },
    marketplaceZone: {
      findMany: jest.fn().mockResolvedValue([]),
    },
  },
}));

jest.mock('@/modules/driver/application/services/driver-eligibility-service', () => ({
  isDriverDispatchEligible: jest.fn().mockResolvedValue({ isEligible: true, reasons: [] }),
}));

import { prisma } from '@/shared/database/prisma';
import { HistoricalBaselineForecastProvider } from '@/modules/marketplace-intelligence/domain/forecast-service';

describe('Historical Baseline Forecast Provider Tests', () => {
  let provider: HistoricalBaselineForecastProvider;

  beforeEach(() => {
    jest.clearAllMocks();
    provider = new HistoricalBaselineForecastProvider();
    (prisma.marketplaceZone.findMany as jest.Mock).mockResolvedValue([]);
    (prisma.driverCurrentLocation.findMany as jest.Mock).mockResolvedValue([]);
  });

  it('should return INSUFFICIENT_DATA confidence when no historical bookings exist', async () => {
    (prisma.scheduledRide.count as jest.Mock).mockResolvedValue(0);
    (prisma.booking.count as jest.Mock).mockResolvedValue(0);
    (prisma.driverProfile.findMany as jest.Mock).mockResolvedValue([
      { id: 'd1', availabilityStatus: 'AVAILABLE' },
      { id: 'd2', availabilityStatus: 'AVAILABLE' },
      { id: 'd3', availabilityStatus: 'AVAILABLE' },
      { id: 'd4', availabilityStatus: 'AVAILABLE' },
      { id: 'd5', availabilityStatus: 'AVAILABLE' },
    ]);

    const result = await provider.generateForecast('1h');

    expect(result.confidence).toBe('INSUFFICIENT_DATA');
    expect(result.forecastedDemand).toBe(0);
    expect(result.explanation).toContain('Insufficient historical data');
    expect(result.modelVersion).toBe('baseline-v1');
  });

  it('should calculate weighted forecast demand when historical samples exist', async () => {
    (prisma.scheduledRide.count as jest.Mock).mockResolvedValue(3);
    (prisma.booking.count as jest.Mock)
      .mockResolvedValueOnce(30)
      .mockResolvedValueOnce(25)
      .mockResolvedValueOnce(20)
      .mockResolvedValueOnce(15);
    (prisma.driverProfile.findMany as jest.Mock).mockResolvedValue(
      Array.from({ length: 10 }, (_, i) => ({ id: `d${i}`, availabilityStatus: 'AVAILABLE' })),
    );

    const result = await provider.generateForecast('1h');

    expect(result.confidence).toBe('HIGH');
    expect(result.knownScheduledDemand).toBe(3);
    expect(result.expectedOrganicDemand).toBeGreaterThan(0);
    expect(result.forecastedDemand).toBe(result.expectedOrganicDemand + 3);
  });

  it('derives expectedEligibleSupply from the real dispatch-eligible driver count, not a raw AVAILABLE count', async () => {
    (prisma.scheduledRide.count as jest.Mock).mockResolvedValue(0);
    (prisma.booking.count as jest.Mock).mockResolvedValue(0);
    (prisma.driverProfile.findMany as jest.Mock).mockResolvedValue([
      { id: 'd1', availabilityStatus: 'AVAILABLE' },
      { id: 'd2', availabilityStatus: 'AVAILABLE' },
      { id: 'd3', availabilityStatus: 'BUSY' },
    ]);

    const result = await provider.generateForecast('1h');

    // 2 AVAILABLE (dispatch-eligible per the mocked eligibility service),
    // BUSY drivers never count toward eligible supply.
    expect(result.expectedEligibleSupply).toBe(2);
  });

  it('filters scheduled-ride and historical booking counts by zone when a zoneId is provided', async () => {
    (prisma.driverProfile.findMany as jest.Mock).mockResolvedValue([]);
    (prisma.marketplaceZone.findMany as jest.Mock).mockResolvedValue([
      {
        id: 'zone-1',
        code: 'ZONE1',
        name: 'Zone One',
        description: null,
        centerLatitude: 10,
        centerLongitude: 10,
        radiusMeters: 1000,
        status: 'ACTIVE',
      },
    ]);
    (prisma.scheduledRide.findMany as jest.Mock).mockResolvedValue([
      { pickupLatitude: 10, pickupLongitude: 10 }, // inside zone-1
      { pickupLatitude: 80, pickupLongitude: 80 }, // far outside -> unzoned
    ]);
    (prisma.booking.findMany as jest.Mock).mockResolvedValue([
      { pickupLatitude: 10, pickupLongitude: 10 },
      { pickupLatitude: 10, pickupLongitude: 10 },
      { pickupLatitude: 80, pickupLongitude: 80 },
    ]);

    const result = await provider.generateForecast('1h', 'zone-1');

    // Only the in-zone points should be counted — this is the exact bug
    // fix: previously zoneId was accepted and echoed back but never
    // actually applied to any query, so global and per-zone forecasts were
    // identical.
    expect(result.knownScheduledDemand).toBe(1);
    expect(prisma.scheduledRide.count).not.toHaveBeenCalled();
    expect(prisma.booking.count).not.toHaveBeenCalled();
    expect(result.zoneId).toBe('zone-1');
  });

  it('keeps the cheap count() fast path when no zoneId is requested', async () => {
    (prisma.driverProfile.findMany as jest.Mock).mockResolvedValue([]);
    (prisma.scheduledRide.count as jest.Mock).mockResolvedValue(2);
    (prisma.booking.count as jest.Mock).mockResolvedValue(5);

    await provider.generateForecast('1h');

    expect(prisma.scheduledRide.count).toHaveBeenCalled();
    expect(prisma.scheduledRide.findMany).not.toHaveBeenCalled();
    expect(prisma.booking.findMany).not.toHaveBeenCalled();
  });
});
