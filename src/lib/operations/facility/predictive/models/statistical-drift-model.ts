import { AnomalyDetectionResult } from '../predictive-types';
import { AnomalySeverity, SensorType } from '../../facility-types';
import { TelemetryAggregateSummary } from '../../telemetry/telemetry-aggregator';

export class StatisticalDriftModel {
  /**
   * Evaluates sensor reading using rolling Z-Score: Z = (X - μ) / σ
   */
  public static evaluate(
    sensorId: string,
    equipmentId: string,
    sensorType: SensorType,
    currentValue: number,
    stats: TelemetryAggregateSummary | null,
    minThreshold?: number | null,
    maxThreshold?: number | null
  ): AnomalyDetectionResult {
    let anomalyScore = 0.0;
    let isAnomaly = false;
    let severity: AnomalySeverity = 'low';
    let alertType = 'sensor_drift';
    let reason = 'Operating within normal baseline';

    const expectedValue = stats ? stats.mean : currentValue;

    // 1. Hard Threshold Bounds Violation Check
    if (typeof maxThreshold === 'number' && currentValue > maxThreshold) {
      const overshoot = (currentValue - maxThreshold) / (maxThreshold || 1);
      anomalyScore = Math.min(1.0, 0.6 + overshoot * 0.4);
      isAnomaly = true;
      severity = overshoot > 0.25 ? 'critical' : 'high';
      alertType = 'threshold_breach_high';
      reason = `Reading ${currentValue} exceeded upper safety threshold ${maxThreshold}`;
    } else if (typeof minThreshold === 'number' && currentValue < minThreshold) {
      const undershoot = (minThreshold - currentValue) / (minThreshold || 1);
      anomalyScore = Math.min(1.0, 0.6 + undershoot * 0.4);
      isAnomaly = true;
      severity = undershoot > 0.25 ? 'critical' : 'high';
      alertType = 'threshold_breach_low';
      reason = `Reading ${currentValue} dropped below lower safety threshold ${minThreshold}`;
    }
    // 2. Statistical Z-Score / Standard Deviation Check
    else if (stats && stats.stdDev > 0.0001) {
      const zScore = Math.abs((currentValue - stats.mean) / stats.stdDev);

      if (zScore >= 3.0) {
        anomalyScore = Math.min(1.0, 0.5 + (zScore - 3.0) * 0.15);
        isAnomaly = true;
        severity = zScore >= 4.5 ? 'critical' : zScore >= 3.5 ? 'high' : 'medium';
        alertType = 'statistical_zscore_anomaly';
        reason = `Statistical drift detected: Z-Score ${zScore.toFixed(2)} σ exceeds 3.0σ limit`;
      } else if (stats.count >= 10 && stats.stdDev < 0.00001 && stats.mean !== 0) {
        // Sensor flatline / freeze detection
        anomalyScore = 0.7;
        isAnomaly = true;
        severity = 'medium';
        alertType = 'sensor_freeze_flatline';
        reason = 'Sensor flatline detected: zero variance across 10+ consecutive samples';
      }
    }

    return {
      sensorId,
      equipmentId,
      sensorType,
      currentValue,
      expectedValue,
      anomalyScore: Number(anomalyScore.toFixed(4)),
      isAnomaly,
      severity,
      alertType,
      reason,
      timestamp: new Date().toISOString(),
    };
  }
}
