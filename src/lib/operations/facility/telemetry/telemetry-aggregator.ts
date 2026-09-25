import { BufferedReading, timeSeriesBuffer } from './time-series-buffer';

export interface TelemetryAggregateSummary {
  sensorId: string;
  count: number;
  mean: number;
  median: number;
  min: number;
  max: number;
  stdDev: number;
  rms: number; // Root Mean Square for vibration metrics
  rateOfChange: number; // Delta per second
}

export class TelemetryAggregator {
  public static calculateStats(readings: BufferedReading[]): TelemetryAggregateSummary | null {
    if (!readings || readings.length === 0) return null;

    const sensorId = readings[0].sensorId;
    const values = readings.map((r) => r.value).filter((v) => !isNaN(v));
    if (values.length === 0) return null;

    const count = values.length;
    const sum = values.reduce((acc, v) => acc + v, 0);
    const mean = sum / count;

    // Median
    const sorted = [...values].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    const median = sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;

    const min = sorted[0];
    const max = sorted[sorted.length - 1];

    // Standard Deviation
    const variance = values.reduce((acc, v) => acc + Math.pow(v - mean, 2), 0) / count;
    const stdDev = Math.sqrt(variance);

    // RMS (Root Mean Square)
    const sumSquares = values.reduce((acc, v) => acc + Math.pow(v, 2), 0);
    const rms = Math.sqrt(sumSquares / count);

    // Rate of change (delta per second between oldest and newest reading in window)
    let rateOfChange = 0;
    if (readings.length >= 2) {
      const first = readings[0];
      const last = readings[readings.length - 1];
      const deltaMs = last.timestamp - first.timestamp;
      if (deltaMs > 0) {
        rateOfChange = (last.value - first.value) / (deltaMs / 1000);
      }
    }

    return {
      sensorId,
      count,
      mean: Number(mean.toFixed(4)),
      median: Number(median.toFixed(4)),
      min: Number(min.toFixed(4)),
      max: Number(max.toFixed(4)),
      stdDev: Number(stdDev.toFixed(4)),
      rms: Number(rms.toFixed(4)),
      rateOfChange: Number(rateOfChange.toFixed(6)),
    };
  }

  public static getAggregatesForWindow(sensorId: string, durationMs: number, tenantId: string = 'global'): TelemetryAggregateSummary | null {
    const readings = timeSeriesBuffer.getWindow(sensorId, durationMs, tenantId);
    return this.calculateStats(readings);
  }
}
