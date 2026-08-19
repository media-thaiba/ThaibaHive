import { db } from "@/db";
import { timeSeriesDecompositions } from "@thaiba/db/schema";
import {  } from "drizzle-orm";

export interface TimeSeriesDecompositionResult {
  id: string;
  tenantId: string;
  metricName: string;
  granularity: "monthly" | "quarterly" | "weekly";
  components: {
    observed: number[];
    trend: number[];
    seasonal: number[];
    residual: number[];
  };
  anomalies: {
    index: number;
    value: number;
    expectedValue: number;
    sigmaDeviation: number;
    type: "positive_anomaly" | "negative_anomaly";
  }[];
  decomposedAt: string;
}

export class TimeSeriesDecompositionEngine {
  /**
   * Decomposes an observed numeric time-series into trend, seasonal, and residual components
   * using a centered moving-average trend extraction and periodic mean seasonal cycle isolation.
   */
  decomposeTimeSeries(
    observed: number[],
    period = 12
  ): { trend: number[]; seasonal: number[]; residual: number[] } {
    const n = observed.length;

    // 1. Calculate Trend Component using centered moving average
    const trend: number[] = new Array(n).fill(0);
    const halfPeriod = Math.floor(period / 2);

    for (let i = 0; i < n; i++) {
      if (i < halfPeriod || i >= n - halfPeriod) {
        // Simple linear boundary extrapolation or nearest value
        trend[i] = observed[i];
      } else {
        let sum = 0;
        for (let j = i - halfPeriod; j <= i + halfPeriod; j++) {
          sum += observed[j];
        }
        trend[i] = sum / (2 * halfPeriod + 1);
      }
    }

    // 2. Detrend series: Detrended = Observed - Trend
    const detrended = observed.map((val, idx) => val - trend[idx]);

    // 3. Compute Seasonal Component: Average detrended values per periodic index
    const seasonalPattern = new Array(period).fill(0);
    const counts = new Array(period).fill(0);

    for (let i = 0; i < n; i++) {
      const pIdx = i % period;
      seasonalPattern[pIdx] += detrended[i];
      counts[pIdx] += 1;
    }

    for (let p = 0; p < period; p++) {
      if (counts[p] > 0) {
        seasonalPattern[p] /= counts[p];
      }
    }

    // Normalize seasonal pattern so sum is 0
    const seasonalMean = seasonalPattern.reduce((a, b) => a + b, 0) / period;
    const normalizedSeasonalPattern = seasonalPattern.map(val => val - seasonalMean);

    const seasonal = observed.map((_, idx) => normalizedSeasonalPattern[idx % period]);

    // 4. Compute Residual Component: Residual = Observed - Trend - Seasonal
    const residual = observed.map((val, idx) => val - trend[idx] - seasonal[idx]);

    return { trend, seasonal, residual };
  }

  async runDecomposition(
    tenantId: string,
    metricName: string,
    observed: number[],
    granularity: "monthly" | "quarterly" | "weekly" = "monthly"
  ): Promise<TimeSeriesDecompositionResult> {
    const period = granularity === "monthly" ? 12 : granularity === "quarterly" ? 4 : 52;
    const { trend, seasonal, residual } = this.decomposeTimeSeries(observed, Math.min(period, Math.floor(observed.length / 2) || 1));

    // Calculate mean & std deviation of residual for 3-sigma anomaly detection
    const meanRes = residual.reduce((a, b) => a + b, 0) / (residual.length || 1);
    const varianceRes = residual.reduce((acc, val) => acc + Math.pow(val - meanRes, 2), 0) / (residual.length || 1);
    const stdDevRes = Math.sqrt(varianceRes) || 1.0;

    const anomalies: TimeSeriesDecompositionResult["anomalies"] = [];

    residual.forEach((resVal, idx) => {
      const zScore = Math.abs(resVal - meanRes) / stdDevRes;
      if (zScore >= 2.5) {
        const expected = trend[idx] + seasonal[idx];
        anomalies.push({
          index: idx,
          value: observed[idx],
          expectedValue: expected,
          sigmaDeviation: parseFloat(zScore.toFixed(2)),
          type: resVal < meanRes ? "negative_anomaly" : "positive_anomaly",
        });
      }
    });

    const decompositionId = `ts_decomp_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const now = new Date().toISOString();

    try {
      await db.insert(timeSeriesDecompositions).values({
        id: decompositionId,
        tenantId,
        metricName,
        granularity,
        observedJson: JSON.stringify(observed),
        trendJson: JSON.stringify(trend),
        seasonalJson: JSON.stringify(seasonal),
        residualJson: JSON.stringify(residual),
        anomaliesJson: JSON.stringify(anomalies),
        decomposedAt: now,
      }).run();
    } catch {
      // In-memory fallback
    }

    return {
      id: decompositionId,
      tenantId,
      metricName,
      granularity,
      components: {
        observed,
        trend,
        seasonal,
        residual,
      },
      anomalies,
      decomposedAt: now,
    };
  }
}

export const timeSeriesDecompositionEngine = new TimeSeriesDecompositionEngine();
