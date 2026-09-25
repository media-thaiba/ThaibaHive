import { anomalyDetector } from '../../../operations/facility/predictive/anomaly-detector';
import { facilityStore } from '../../../db/facility-store';
import { timeSeriesBuffer } from '../../../operations/facility/telemetry/time-series-buffer';

describe('Predictive Anomaly Detection Engine (Sprint-052 FACILITY-005)', () => {
  beforeEach(() => {
    facilityStore.clearMemoryStore();
    timeSeriesBuffer.clear();
  });

  it('should detect upper safety threshold breach anomalies', async () => {
    const equip = await facilityStore.createEquipment({
      assetTag: 'CHILLER-01',
      name: 'Central Chiller',
      buildingId: 'bldg_eng',
      floorId: 'floor_basement',
      institutionId: 'inst_alpha',
    });

    await facilityStore.registerSensor({
      sensorId: 'CHILLER_PRESS_01',
      equipmentId: equip.id,
      sensorType: 'pressure',
      minThreshold: 100,
      maxThreshold: 500,
      institutionId: 'inst_alpha',
    });

    const result = await anomalyDetector.evaluateSensor('CHILLER_PRESS_01', 650, 'inst_alpha');
    expect(result.isAnomaly).toBe(true);
    expect(result.severity).toBe('critical');
    expect(result.alertType).toBe('threshold_breach_high');
    expect(result.anomalyScore).toBeGreaterThanOrEqual(0.7);
  });

  it('should detect statistical Z-score drift anomalies', async () => {
    const equip = await facilityStore.createEquipment({
      assetTag: 'PUMP-01',
      name: 'Circulation Pump',
      buildingId: 'bldg_eng',
      floorId: 'floor_1',
      institutionId: 'inst_alpha',
    });

    await facilityStore.registerSensor({
      sensorId: 'PUMP_TEMP_01',
      equipmentId: equip.id,
      sensorType: 'temperature',
      institutionId: 'inst_alpha',
    });

    // Populate normal baseline: ~50°C
    for (let i = 0; i < 20; i++) {
      const normalVal = 50 + (Math.sin(i) * 0.5);
      await anomalyDetector.evaluateSensor('PUMP_TEMP_01', normalVal, 'inst_alpha');
    }

    // Sudden surge: 75°C (> 5 standard deviations away)
    const anomalyResult = await anomalyDetector.evaluateSensor('PUMP_TEMP_01', 75.0, 'inst_alpha');
    expect(anomalyResult.isAnomaly).toBe(true);
    expect(anomalyResult.alertType).toBe('statistical_zscore_anomaly');
    expect(anomalyResult.anomalyScore).toBeGreaterThanOrEqual(0.5);
  });
});
