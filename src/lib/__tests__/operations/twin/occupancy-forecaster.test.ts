import { OccupancyForecaster } from '../../../operations/twin/ml/occupancy-forecaster';
import { TimeSeriesUtils } from '../../../operations/twin/ml/time-series-utils';

describe('Occupancy Forecaster & Time-Series Utils', () => {
  it('should compute Holt linear exponential smoothing with trend and confidence bounds', () => {
    const historical = [10, 15, 20, 25, 30, 35, 40];
    const forecasts = TimeSeriesUtils.holtLinearSmoothing(historical, 5, 0.5, 0.3);

    expect(forecasts.length).toBe(5);
    expect(forecasts[0].value).toBeGreaterThan(35);
    expect(forecasts[0].confidenceUpper).toBeGreaterThan(forecasts[0].value);
    expect(forecasts[0].confidenceLower).toBeLessThan(forecasts[0].value);
  });

  it('should generate 24-hour occupancy forecast points capped at room capacity', () => {
    const forecast = OccupancyForecaster.forecastNext24Hours('SPC-101', 60, [10, 20, 30, 40, 50, 45, 30, 15, 5], 8);
    expect(forecast.length).toBe(24);
    for (const pt of forecast) {
      expect(pt.predictedOccupancy).toBeLessThanOrEqual(60);
      expect(pt.predictedOccupancy).toBeGreaterThanOrEqual(0);
      expect(pt.utilizationPct).toBeLessThanOrEqual(100);
    }
  });

  it('should summarize peak occupancy and detect bottlenecks', () => {
    const forecast = OccupancyForecaster.forecastNext24Hours('SPC-101', 50, [10, 20, 30, 45, 50, 48, 30, 15, 5], 8);
    const summary = OccupancyForecaster.summarizeForecast(forecast);

    expect(summary.peakOccupancy).toBeGreaterThan(0);
    expect(summary.peakHour).toBeGreaterThanOrEqual(0);
    expect(summary.avgUtilizationPct).toBeGreaterThan(0);
  });
});
