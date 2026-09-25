import { AnomalyDetectionResult } from './predictive-types';
import { StatisticalDriftModel } from './models/statistical-drift-model';
import { TelemetryAggregator } from '../telemetry/telemetry-aggregator';
import { timeSeriesBuffer } from '../telemetry/time-series-buffer';
import { facilityStore } from '../../../db/facility-store';

export class AnomalyDetector {
  private static instance: AnomalyDetector;

  public static getInstance(): AnomalyDetector {
    if (!AnomalyDetector.instance) {
      AnomalyDetector.instance = new AnomalyDetector();
    }
    return AnomalyDetector.instance;
  }

  public async evaluateSensor(
    sensorId: string,
    currentValue: number,
    institutionId: string = 'global'
  ): Promise<AnomalyDetectionResult> {
    const sensor = await facilityStore.getSensorById(sensorId, institutionId);
    const equipmentId = sensor ? sensor.equipmentId : 'unknown_equip';
    const sensorType = sensor ? sensor.sensorType : 'temperature';
    const minThresh = sensor?.minThreshold;
    const maxThresh = sensor?.maxThreshold;

    // Push into time-series buffer
    timeSeriesBuffer.push(sensorId, equipmentId, currentValue, sensor?.unit || 'celsius', institutionId);

    // Compute rolling 5-minute stats
    const stats = TelemetryAggregator.getAggregatesForWindow(sensorId, 5 * 60 * 1000, institutionId);

    const result = StatisticalDriftModel.evaluate(
      sensorId,
      equipmentId,
      sensorType,
      currentValue,
      stats,
      minThresh,
      maxThresh
    );

    // If anomaly, update sensor status in store
    if (result.isAnomaly && sensor) {
      const newStatus = result.severity === 'critical' ? 'critical' : 'warning';
      await facilityStore.registerSensor({
        ...sensor,
        status: newStatus,
        lastReadingValue: currentValue,
        lastReadingAt: new Date().toISOString(),
      });
    }

    return result;
  }
}

export const anomalyDetector = AnomalyDetector.getInstance();
