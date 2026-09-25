/**
 * Time Series Rollup Engine
 * Downsamples high-frequency 1-minute telemetry into 15m, 1h, and 1d aggregates
 */

import { NormalizedEnergyTelemetry } from './energy-protocol-adapters';

export interface EnergyRollupBucket {
  assetId: string;
  bucketStartTime: string;
  bucketEndTime: string;
  durationMinutes: number;
  sampleCount: number;
  avgPowerKw: number;
  peakPowerKw: number;
  minPowerKw: number;
  totalEnergyKwh: number;
  avgVoltageV: number;
  avgCurrentA: number;
  avgPowerFactor: number;
  avgCarbonGramsPerKwh: number;
}

export class TimeSeriesRollup {
  /**
   * Aggregate an array of telemetry points into time-bucketed rollups
   */
  public static aggregate(
    points: NormalizedEnergyTelemetry[],
    bucketMinutes: number = 15
  ): EnergyRollupBucket[] {
    if (!points || points.length === 0) return [];

    // Sort chronologically
    const sorted = [...points].sort((a, b) => a.recordedAt.localeCompare(b.recordedAt));
    const bucketDurationMs = bucketMinutes * 60 * 1000;

    // Group by asset and time bucket
    const groupedBuckets = new Map<string, NormalizedEnergyTelemetry[]>();

    for (const point of sorted) {
      const pointTime = new Date(point.recordedAt).getTime();
      const bucketStartMs = Math.floor(pointTime / bucketDurationMs) * bucketDurationMs;
      const key = `${point.assetId}_${bucketStartMs}`;

      const list = groupedBuckets.get(key) || [];
      list.push(point);
      groupedBuckets.set(key, list);
    }

    const rollups: EnergyRollupBucket[] = [];

    for (const [key, samples] of groupedBuckets.entries()) {
      if (samples.length === 0) continue;

      const firstSample = samples[0];
      const pointTime = new Date(firstSample.recordedAt).getTime();
      const bucketStartMs = Math.floor(pointTime / bucketDurationMs) * bucketDurationMs;
      const bucketEndMs = bucketStartMs + bucketDurationMs;

      let sumPower = 0;
      let peakPower = -Infinity;
      let minPower = Infinity;
      let sumVoltage = 0;
      let sumCurrent = 0;
      let sumPf = 0;
      let sumCarbon = 0;

      for (const s of samples) {
        sumPower += s.powerKw;
        if (s.powerKw > peakPower) peakPower = s.powerKw;
        if (s.powerKw < minPower) minPower = s.powerKw;
        sumVoltage += s.voltageV;
        sumCurrent += s.currentA;
        sumPf += s.powerFactor;
        sumCarbon += s.carbonGramsPerKwh;
      }

      const count = samples.length;
      const avgPowerKw = Number((sumPower / count).toFixed(3));
      // Energy in kWh = Average power (kW) * duration in hours (bucketMinutes / 60)
      const totalEnergyKwh = Number((avgPowerKw * (bucketMinutes / 60)).toFixed(3));

      rollups.push({
        assetId: firstSample.assetId,
        bucketStartTime: new Date(bucketStartMs).toISOString(),
        bucketEndTime: new Date(bucketEndMs).toISOString(),
        durationMinutes: bucketMinutes,
        sampleCount: count,
        avgPowerKw,
        peakPowerKw: Number(peakPower.toFixed(3)),
        minPowerKw: Number(minPower.toFixed(3)),
        totalEnergyKwh,
        avgVoltageV: Number((sumVoltage / count).toFixed(1)),
        avgCurrentA: Number((sumCurrent / count).toFixed(1)),
        avgPowerFactor: Number((sumPf / count).toFixed(3)),
        avgCarbonGramsPerKwh: Number((sumCarbon / count).toFixed(1)),
      });
    }

    return rollups.sort((a, b) => a.bucketStartTime.localeCompare(b.bucketStartTime));
  }
}
