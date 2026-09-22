import 'server-only';
import { prisma } from '@/shared/database/prisma';
import { ScheduledRideStatus, DriverAvailabilityStatus } from '@prisma/client';

export type ForecastHorizon = '30m' | '1h' | '2h' | '4h';
export type ForecastConfidence = 'HIGH' | 'MEDIUM' | 'LOW' | 'INSUFFICIENT_DATA';

export interface DemandForecastResult {
  horizon: ForecastHorizon;
  targetWindow: {
    start: string;
    end: string;
  };
  forecastedDemand: number;
  expectedOrganicDemand: number;
  knownScheduledDemand: number;
  expectedEligibleSupply: number;
  confidence: ForecastConfidence;
  explanation: string;
  modelVersion: string;
  zoneId?: string;
}

export interface ForecastProvider {
  generateForecast(
    horizon: ForecastHorizon,
    zoneId?: string,
    vehicleCategory?: string,
    targetStartTime?: Date,
  ): Promise<DemandForecastResult>;
}

export class HistoricalBaselineForecastProvider implements ForecastProvider {
  public readonly modelVersion = 'baseline-v1';

  async generateForecast(
    horizon: ForecastHorizon = '1h',
    zoneId?: string,
    vehicleCategory?: string,
    targetStartTime: Date = new Date(),
  ): Promise<DemandForecastResult> {
    let durationMinutes = 60;
    if (horizon === '30m') durationMinutes = 30;
    else if (horizon === '2h') durationMinutes = 120;
    else if (horizon === '4h') durationMinutes = 240;

    const targetEndTime = new Date(targetStartTime.getTime() + durationMinutes * 60 * 1000);

    // 1. Calculate known scheduled rides in target window
    const scheduledRideCount = await prisma.scheduledRide.count({
      where: {
        status: ScheduledRideStatus.ACTIVE,
        nextOccurrenceAt: {
          gte: targetStartTime,
          lte: targetEndTime,
        },
        ...(vehicleCategory ? { vehicleCategory } : {}),
      },
    });

    // 2. Fetch comparable historical sample windows across 4 prior weeks
    const historicalSamples: number[] = [];
    const windowMs = durationMinutes * 60 * 1000;

    for (let weekOffset = 1; weekOffset <= 4; weekOffset++) {
      const sampleStart = new Date(
        targetStartTime.getTime() - weekOffset * 7 * 24 * 60 * 60 * 1000,
      );
      const sampleEnd = new Date(sampleStart.getTime() + windowMs);

      const count = await prisma.booking.count({
        where: {
          createdAt: {
            gte: sampleStart,
            lte: sampleEnd,
          },
          ...(vehicleCategory ? { vehicleCategory: { code: vehicleCategory } } : {}),
        },
      });

      historicalSamples.push(count);
    }

    // Determine confidence and sample statistics
    const nonZeroSamples = historicalSamples.filter((c) => c > 0);
    const totalHistoricalCount = historicalSamples.reduce((a, b) => a + b, 0);

    let confidence: ForecastConfidence = 'HIGH';
    let expectedOrganicDemand = 0;

    if (totalHistoricalCount === 0) {
      confidence = 'INSUFFICIENT_DATA';
      expectedOrganicDemand = 0;
    } else {
      // Weighted average: more recent weeks weighted higher (0.4, 0.3, 0.2, 0.1)
      const weights = [0.4, 0.3, 0.2, 0.1];
      let weightedSum = 0;
      let totalWeight = 0;

      for (let i = 0; i < historicalSamples.length; i++) {
        weightedSum += historicalSamples[i] * weights[i];
        totalWeight += weights[i];
      }

      expectedOrganicDemand = Math.round(weightedSum / totalWeight);

      if (nonZeroSamples.length <= 1) {
        confidence = 'LOW';
      } else if (nonZeroSamples.length <= 3) {
        confidence = 'MEDIUM';
      } else {
        confidence = 'HIGH';
      }
    }

    const forecastedDemand = expectedOrganicDemand + scheduledRideCount;

    // Estimate expected eligible supply based on active drivers online & scheduled shifts
    const onlineDriversCount = await prisma.driverProfile.count({
      where: {
        availabilityStatus: DriverAvailabilityStatus.AVAILABLE,
        ...(vehicleCategory ? { vehicleCategory } : {}),
      },
    });

    const expectedEligibleSupply = Math.max(1, onlineDriversCount);

    let explanation = '';
    if (confidence === 'INSUFFICIENT_DATA') {
      explanation = `Insufficient historical data to form a reliable baseline for this ${horizon} window. Showing 0 forecasted organic rides plus ${scheduledRideCount} known scheduled rides.`;
    } else {
      const avgHistorical = Math.round(totalHistoricalCount / historicalSamples.length);
      explanation = `Expected demand for ${horizon} window is ${forecastedDemand} requests (${expectedOrganicDemand} organic baseline + ${scheduledRideCount} scheduled rides) based on weighted average of ${avgHistorical} requests in comparable historical periods.`;
    }

    return {
      horizon,
      targetWindow: {
        start: targetStartTime.toISOString(),
        end: targetEndTime.toISOString(),
      },
      forecastedDemand,
      expectedOrganicDemand,
      knownScheduledDemand: scheduledRideCount,
      expectedEligibleSupply,
      confidence,
      explanation,
      modelVersion: this.modelVersion,
      zoneId,
    };
  }
}

export const defaultForecastProvider = new HistoricalBaselineForecastProvider();
