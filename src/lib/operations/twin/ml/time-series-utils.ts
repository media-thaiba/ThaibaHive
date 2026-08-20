export interface ForecastPoint {
  index: number;
  value: number;
  confidenceLower: number;
  confidenceUpper: number;
}

export class TimeSeriesUtils {
  /**
   * Double Exponential Smoothing (Holt's Linear Trend Model)
   */
  public static holtLinearSmoothing(
    data: number[],
    forecastSteps: number,
    alpha: number = 0.4,
    beta: number = 0.2
  ): ForecastPoint[] {
    if (!data || data.length === 0) return [];
    if (data.length === 1) {
      return Array.from({ length: forecastSteps }, (_, i) => ({
        index: i,
        value: data[0],
        confidenceLower: Math.max(0, data[0] * 0.9),
        confidenceUpper: data[0] * 1.1,
      }));
    }

    let level = data[0];
    let trend = data[1] - data[0];

    for (let i = 1; i < data.length; i++) {
      const prevLevel = level;
      level = alpha * data[i] + (1 - alpha) * (level + trend);
      trend = beta * (level - prevLevel) + (1 - beta) * trend;
    }

    // Compute standard error of historical fit
    const residuals = data.map((actual) => Math.abs(actual - level));
    const meanError = residuals.reduce((a, b) => a + b, 0) / residuals.length || 2.0;

    const forecasts: ForecastPoint[] = [];
    for (let h = 1; h <= forecastSteps; h++) {
      const val = Math.max(0, level + h * trend);
      const margin = meanError * Math.sqrt(h) * 1.645; // 90% confidence
      forecasts.push({
        index: data.length + h - 1,
        value: Number(val.toFixed(1)),
        confidenceLower: Number(Math.max(0, val - margin).toFixed(1)),
        confidenceUpper: Number((val + margin).toFixed(1)),
      });
    }

    return forecasts;
  }

  /**
   * Diurnal / 24-hour seasonal profile superposition
   */
  public static applyDiurnalProfile(baseForecasts: ForecastPoint[], hourOffsets: number[]): ForecastPoint[] {
    // Standard campus daily occupancy multiplier by hour (0 to 23)
    const diurnalCurve = [
      0.02, 0.01, 0.01, 0.01, 0.02, 0.05, // 00:00 - 05:00
      0.15, 0.45, 0.85, 0.95, 1.00, 0.90, // 06:00 - 11:00
      0.75, 0.92, 0.98, 0.88, 0.70, 0.50, // 12:00 - 17:00
      0.35, 0.25, 0.15, 0.08, 0.05, 0.03, // 18:00 - 23:00
    ];

    return baseForecasts.map((pt, i) => {
      const hour = (hourOffsets[i] !== undefined ? hourOffsets[i] : (i % 24));
      const mult = diurnalCurve[hour] !== undefined ? diurnalCurve[hour] : 0.5;
      const adjustedVal = pt.value * mult;
      return {
        ...pt,
        value: Number(adjustedVal.toFixed(1)),
        confidenceLower: Number((pt.confidenceLower * mult).toFixed(1)),
        confidenceUpper: Number((pt.confidenceUpper * mult).toFixed(1)),
      };
    });
  }
}
