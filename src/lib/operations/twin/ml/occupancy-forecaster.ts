import { OccupancyForecastPoint } from '../twin-types';
import { TimeSeriesUtils } from './time-series-utils';

export class OccupancyForecaster {
  /**
   * Forecast hourly occupancy for the next 24 hours
   */
  public static forecastNext24Hours(
    spaceId: string,
    capacity: number,
    historicalOccupancy: number[] = [],
    startHour: number = 0
  ): OccupancyForecastPoint[] {
    const historical = historicalOccupancy.length >= 5
      ? historicalOccupancy
      : [0, 5, 20, 35, 42, 40, 30, 25, 10, 2]; // Default sample curve

    const baseForecasts = TimeSeriesUtils.holtLinearSmoothing(historical, 24, 0.4, 0.2);
    const hourOffsets = Array.from({ length: 24 }, (_, i) => (startHour + i) % 24);
    const diurnalPoints = TimeSeriesUtils.applyDiurnalProfile(baseForecasts, hourOffsets);

    const now = new Date();
    return diurnalPoints.map((pt, i) => {
      const forecastTime = new Date(now.getTime() + i * 3600 * 1000);
      const cappedOccupancy = Math.min(capacity, Math.max(0, Math.round(pt.value)));
      const utilPct = capacity > 0 ? Number(((cappedOccupancy / capacity) * 100).toFixed(1)) : 0;

      return {
        timestamp: forecastTime.toISOString(),
        hour: hourOffsets[i],
        predictedOccupancy: cappedOccupancy,
        capacity,
        confidenceLower: Math.min(capacity, Math.max(0, Math.round(pt.confidenceLower))),
        confidenceUpper: Math.min(capacity, Math.max(0, Math.round(pt.confidenceUpper))),
        utilizationPct: utilPct,
      };
    });
  }

  /**
   * Calculate summary metrics from forecast
   */
  public static summarizeForecast(forecast: OccupancyForecastPoint[]): {
    peakOccupancy: number;
    peakHour: number;
    avgUtilizationPct: number;
    isBottleneckPredicted: boolean;
    underutilizedHours: number[];
  } {
    let peakOccupancy = 0;
    let peakHour = 0;
    let totalUtil = 0;
    const underutilizedHours: number[] = [];

    for (const pt of forecast) {
      if (pt.predictedOccupancy > peakOccupancy) {
        peakOccupancy = pt.predictedOccupancy;
        peakHour = pt.hour;
      }
      totalUtil += pt.utilizationPct;

      if (pt.hour >= 8 && pt.hour <= 18 && pt.utilizationPct < 25) {
        underutilizedHours.push(pt.hour);
      }
    }

    const avgUtilizationPct = forecast.length > 0 ? Number((totalUtil / forecast.length).toFixed(1)) : 0;
    const isBottleneckPredicted = forecast.some((pt) => pt.utilizationPct >= 95);

    return {
      peakOccupancy,
      peakHour,
      avgUtilizationPct,
      isBottleneckPredicted,
      underutilizedHours,
    };
  }
}
