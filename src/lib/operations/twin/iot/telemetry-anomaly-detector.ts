import { MetricType, SpatialTelemetryFrame } from '../twin-types';

export interface AnomalyDetectionResult {
  isAnomaly: boolean;
  zScore: number;
  expectedMean: number;
  standardDeviation: number;
  severity: 'none' | 'low' | 'medium' | 'high' | 'critical';
  reason?: string;
}

export class TelemetryAnomalyDetector {
  private history: Map<string, number[]> = new Map(); // key: sensorId:metric
  private windowSize: number = 30;

  public evaluateReading(sensorId: string, metric: MetricType, value: number): AnomalyDetectionResult {
    const key = `${sensorId}:${metric}`;
    let values = this.history.get(key);
    if (!values) {
      values = [];
      this.history.set(key, values);
    }

    values.push(value);
    if (values.length > this.windowSize) {
      values.shift();
    }

    if (values.length < 5) {
      return {
        isAnomaly: false,
        zScore: 0,
        expectedMean: value,
        standardDeviation: 0,
        severity: 'none',
      };
    }

    const mean = values.reduce((sum, v) => sum + v, 0) / values.length;
    const variance = values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / values.length;
    const stdDev = Math.sqrt(variance);

    if (stdDev < 0.001) {
      return {
        isAnomaly: false,
        zScore: 0,
        expectedMean: mean,
        standardDeviation: 0,
        severity: 'none',
      };
    }

    const zScore = (value - mean) / stdDev;
    const absZ = Math.abs(zScore);

    if (absZ >= 3.5) {
      return {
        isAnomaly: true,
        zScore: Number(zScore.toFixed(2)),
        expectedMean: Number(mean.toFixed(2)),
        standardDeviation: Number(stdDev.toFixed(2)),
        severity: 'critical',
        reason: `Extreme statistical anomaly (${absZ.toFixed(1)}σ deviation from mean ${mean.toFixed(1)})`,
      };
    } else if (absZ >= 2.5) {
      return {
        isAnomaly: true,
        zScore: Number(zScore.toFixed(2)),
        expectedMean: Number(mean.toFixed(2)),
        standardDeviation: Number(stdDev.toFixed(2)),
        severity: 'high',
        reason: `Moderate drift (${absZ.toFixed(1)}σ deviation)`,
      };
    } else if (absZ >= 2.0) {
      return {
        isAnomaly: true,
        zScore: Number(zScore.toFixed(2)),
        expectedMean: Number(mean.toFixed(2)),
        standardDeviation: Number(stdDev.toFixed(2)),
        severity: 'medium',
        reason: `Minor drift (${absZ.toFixed(1)}σ deviation)`,
      };
    }

    return {
      isAnomaly: false,
      zScore: Number(zScore.toFixed(2)),
      expectedMean: Number(mean.toFixed(2)),
      standardDeviation: Number(stdDev.toFixed(2)),
      severity: 'none',
    };
  }

  public clear(): void {
    this.history.clear();
  }
}
