// Mock Prisma
jest.mock('@/shared/database/prisma', () => ({
  prisma: {
    scheduledRide: {
      count: jest.fn(),
    },
    booking: {
      count: jest.fn(),
    },
    driverProfile: {
      count: jest.fn(),
    },
  },
}));

import { prisma } from '@/shared/database/prisma';
import { HistoricalBaselineForecastProvider } from '@/modules/marketplace-intelligence/domain/forecast-service';

describe('Historical Baseline Forecast Provider Tests', () => {
  let provider: HistoricalBaselineForecastProvider;

  beforeEach(() => {
    jest.clearAllMocks();
    provider = new HistoricalBaselineForecastProvider();
  });

  it('should return INSUFFICIENT_DATA confidence when no historical bookings exist', async () => {
    (prisma.scheduledRide.count as jest.Mock).mockResolvedValue(0);
    (prisma.booking.count as jest.Mock).mockResolvedValue(0);
    (prisma.driverProfile.count as jest.Mock).mockResolvedValue(5);

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
    (prisma.driverProfile.count as jest.Mock).mockResolvedValue(10);

    const result = await provider.generateForecast('1h');

    expect(result.confidence).toBe('HIGH');
    expect(result.knownScheduledDemand).toBe(3);
    expect(result.expectedOrganicDemand).toBeGreaterThan(0);
    expect(result.forecastedDemand).toBe(result.expectedOrganicDemand + 3);
  });
});
