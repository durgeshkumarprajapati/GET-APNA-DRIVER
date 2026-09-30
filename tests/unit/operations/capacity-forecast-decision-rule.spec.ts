jest.mock('@/modules/operations/application/operations-signal-service', () => ({
  collectOperationsSignals: jest.fn(),
}));

jest.mock('@/modules/operations/application/capacity-forecast-service', () => ({
  getCapacityForecastSummary: jest.fn(),
}));

jest.mock('@/shared/database/prisma', () => ({ prisma: {} }));
jest.mock('@/shared/audit/audit-service', () => ({ recordAuditLog: jest.fn() }));
jest.mock('@/shared/logging/logger', () => ({
  logger: { error: jest.fn(), warn: jest.fn(), info: jest.fn() },
}));

import { evaluateOperationsDecisions } from '@/modules/operations/application/operations-decision-service';
import { collectOperationsSignals } from '@/modules/operations/application/operations-signal-service';
import { getCapacityForecastSummary } from '@/modules/operations/application/capacity-forecast-service';
import { logger } from '@/shared/logging/logger';

const mockCollectSignals = collectOperationsSignals as jest.Mock;
const mockGetCapacityForecast = getCapacityForecastSummary as jest.Mock;

const QUIET_SIGNALS = {
  searchingBookingsCount: 0,
  assignedBookingsCount: 0,
  activeTripsCount: 0,
  onlineDriversCount: 10,
  availableDriversCount: 10,
  activeReliabilityIncidentsCount: 0,
  criticalReliabilityIncidentsCount: 0,
  activeSafetyIncidentsCount: 0,
  openSupportTicketsCount: 0,
  highPrioritySupportTicketsCount: 0,
  upcomingUnassignedScheduledRidesCount: 0,
  platformHealthScore: 100,
  evaluatedAt: new Date(),
};

const zoneForecast = (overrides: Partial<Record<string, unknown>> = {}) => ({
  zoneId: 'zone-1',
  zoneName: 'Downtown',
  zoneCode: 'DT',
  forecastedDemand: 20,
  expectedEligibleSupply: 10,
  capacityGap: 10,
  gapRatio: 1,
  status: 'CRITICAL_SHORTAGE',
  confidence: 'HIGH',
  explanation: 'test',
  ...overrides,
});

describe('evaluateOperationsDecisions — CAPACITY_FORECAST_RISK rule', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCollectSignals.mockResolvedValue(QUIET_SIGNALS);
  });

  it('emits a CRITICAL decision citing the worst at-risk zone when one is forecasted', async () => {
    const worst = zoneForecast();
    mockGetCapacityForecast.mockResolvedValue({
      horizon: '1h',
      evaluatedAt: new Date(),
      overall: zoneForecast({ zoneId: undefined, status: 'BALANCED' }),
      zones: [worst],
      worstZone: worst,
    });

    const decisions = await evaluateOperationsDecisions();

    const capacityDecision = decisions.find((d) => d.decisionType === 'CAPACITY_FORECAST_RISK');
    expect(capacityDecision).toBeDefined();
    expect(capacityDecision?.severity).toBe('CRITICAL');
    expect(capacityDecision?.zoneId).toBe('zone-1');
    expect(capacityDecision?.evidence.find((e) => e.key === 'forecastedDemand')?.value).toBe(20);
    expect(capacityDecision?.recommendedActions.some((a) => a.type === 'VIEW_ZONE')).toBe(true);
  });

  it('uses HIGH severity (not CRITICAL) for a plain SHORTAGE, as opposed to CRITICAL_SHORTAGE', async () => {
    const worst = zoneForecast({ status: 'SHORTAGE', gapRatio: 0.4 });
    mockGetCapacityForecast.mockResolvedValue({
      horizon: '1h',
      evaluatedAt: new Date(),
      overall: zoneForecast({ zoneId: undefined, status: 'BALANCED' }),
      zones: [worst],
      worstZone: worst,
    });

    const decisions = await evaluateOperationsDecisions();

    const capacityDecision = decisions.find((d) => d.decisionType === 'CAPACITY_FORECAST_RISK');
    expect(capacityDecision?.severity).toBe('HIGH');
  });

  it('does not emit a decision when every zone is BALANCED or SURPLUS', async () => {
    mockGetCapacityForecast.mockResolvedValue({
      horizon: '1h',
      evaluatedAt: new Date(),
      overall: zoneForecast({ zoneId: undefined, status: 'BALANCED' }),
      zones: [zoneForecast({ status: 'BALANCED' }), zoneForecast({ status: 'SURPLUS' })],
      worstZone: zoneForecast({ status: 'SURPLUS' }),
    });

    const decisions = await evaluateOperationsDecisions();

    expect(decisions.find((d) => d.decisionType === 'CAPACITY_FORECAST_RISK')).toBeUndefined();
  });

  it('does not crash the whole decision engine when the capacity forecast computation throws', async () => {
    mockGetCapacityForecast.mockRejectedValue(new Error('marketplace-intelligence unavailable'));

    const decisions = await evaluateOperationsDecisions();

    expect(decisions.find((d) => d.decisionType === 'CAPACITY_FORECAST_RISK')).toBeUndefined();
    // Other reactive rules must still evaluate normally.
    expect(Array.isArray(decisions)).toBe(true);
    expect(logger.error).toHaveBeenCalled();
  });
});
