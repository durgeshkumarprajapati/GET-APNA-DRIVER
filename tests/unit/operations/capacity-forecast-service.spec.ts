jest.mock('@/modules/marketplace-intelligence/domain/forecast-service', () => ({
  defaultForecastProvider: {
    generateForecast: jest.fn(),
  },
}));

jest.mock('@/modules/marketplace-intelligence/domain/zone-service', () => ({
  listMarketplaceZones: jest.fn(),
}));

jest.mock('@/shared/database/prisma', () => ({ prisma: {} }));

import { getCapacityForecastSummary } from '@/modules/operations/application/capacity-forecast-service';
import { defaultForecastProvider } from '@/modules/marketplace-intelligence/domain/forecast-service';
import { listMarketplaceZones } from '@/modules/marketplace-intelligence/domain/zone-service';

const mockGenerateForecast = defaultForecastProvider.generateForecast as jest.Mock;
const mockListMarketplaceZones = listMarketplaceZones as jest.Mock;

const zone = (id: string, name: string, code: string, status = 'ACTIVE') => ({
  id,
  code,
  name,
  description: null,
  centerLatitude: 0,
  centerLongitude: 0,
  radiusMeters: 1000,
  status,
});

const forecast = (overrides: Partial<Record<string, unknown>> = {}) => ({
  horizon: '1h',
  targetWindow: { start: '', end: '' },
  forecastedDemand: 10,
  expectedOrganicDemand: 8,
  knownScheduledDemand: 2,
  expectedEligibleSupply: 10,
  confidence: 'HIGH',
  explanation: 'test explanation',
  modelVersion: 'baseline-v1',
  ...overrides,
});

describe('getCapacityForecastSummary', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns a balanced overall status when demand roughly matches supply', async () => {
    mockListMarketplaceZones.mockResolvedValue([]);
    mockGenerateForecast.mockResolvedValue(
      forecast({ forecastedDemand: 10, expectedEligibleSupply: 10 }),
    );

    const result = await getCapacityForecastSummary('1h');

    expect(result.overall.status).toBe('BALANCED');
    expect(result.overall.gapRatio).toBe(0);
    expect(result.zones).toEqual([]);
    expect(result.worstZone).toBeNull();
  });

  it('classifies a zone as CRITICAL_SHORTAGE when forecasted demand is at least double expected supply', async () => {
    mockListMarketplaceZones.mockResolvedValue([zone('z1', 'Downtown', 'DT')]);
    mockGenerateForecast
      .mockResolvedValueOnce(forecast({ forecastedDemand: 20, expectedEligibleSupply: 20 })) // overall
      .mockResolvedValueOnce(forecast({ forecastedDemand: 20, expectedEligibleSupply: 10 })); // zone z1

    const result = await getCapacityForecastSummary('1h');

    expect(result.zones).toHaveLength(1);
    expect(result.zones[0].status).toBe('CRITICAL_SHORTAGE');
    expect(result.zones[0].gapRatio).toBe(1);
    expect(result.worstZone?.zoneId).toBe('z1');
  });

  it('classifies a zone as SURPLUS when supply comfortably exceeds forecasted demand', async () => {
    mockListMarketplaceZones.mockResolvedValue([zone('z2', 'Suburbs', 'SUB')]);
    mockGenerateForecast
      .mockResolvedValueOnce(forecast({ forecastedDemand: 5, expectedEligibleSupply: 5 }))
      .mockResolvedValueOnce(forecast({ forecastedDemand: 5, expectedEligibleSupply: 20 }));

    const result = await getCapacityForecastSummary('1h');

    expect(result.zones[0].status).toBe('SURPLUS');
  });

  it('excludes non-ACTIVE zones from the per-zone breakdown', async () => {
    mockListMarketplaceZones.mockResolvedValue([
      zone('z1', 'Active Zone', 'AZ', 'ACTIVE'),
      zone('z2', 'Retired Zone', 'RZ', 'INACTIVE'),
    ]);
    mockGenerateForecast.mockResolvedValue(forecast());

    const result = await getCapacityForecastSummary('1h');

    expect(result.zones).toHaveLength(1);
    expect(result.zones[0].zoneId).toBe('z1');
  });

  it('picks the single worst zone by status severity when multiple zones are at risk', async () => {
    mockListMarketplaceZones.mockResolvedValue([
      zone('z1', 'Mild Shortage', 'MS'),
      zone('z2', 'Severe Shortage', 'SS'),
    ]);
    mockGenerateForecast
      .mockResolvedValueOnce(forecast()) // overall
      .mockResolvedValueOnce(forecast({ forecastedDemand: 13, expectedEligibleSupply: 10 })) // z1: gapRatio 0.3 -> SHORTAGE
      .mockResolvedValueOnce(forecast({ forecastedDemand: 25, expectedEligibleSupply: 10 })); // z2: gapRatio 1.5 -> CRITICAL_SHORTAGE

    const result = await getCapacityForecastSummary('1h');

    expect(result.worstZone?.zoneId).toBe('z2');
    expect(result.worstZone?.status).toBe('CRITICAL_SHORTAGE');
  });

  it('passes the requested horizon through to the forecast provider and the returned summary', async () => {
    mockListMarketplaceZones.mockResolvedValue([]);
    mockGenerateForecast.mockResolvedValue(forecast({ horizon: '4h' }));

    const result = await getCapacityForecastSummary('4h');

    expect(mockGenerateForecast).toHaveBeenCalledWith('4h', undefined);
    expect(result.horizon).toBe('4h');
  });
});
