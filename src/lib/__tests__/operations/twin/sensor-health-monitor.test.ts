import { SensorHealthMonitor } from '../../../operations/twin/iot/sensor-health-monitor';
import { TelemetryAnomalyDetector } from '../../../operations/twin/iot/telemetry-anomaly-detector';
import { TwinDbStore } from '../../../db/twin-store';

describe('Sensor Health Monitor & Anomaly Detector', () => {
  let monitor: SensorHealthMonitor;
  let detector: TelemetryAnomalyDetector;
  let dbStore: TwinDbStore;

  beforeEach(() => {
    dbStore = TwinDbStore.getInstance();
    dbStore.clearMemoryStore();
    monitor = new SensorHealthMonitor();
    detector = new TelemetryAnomalyDetector();
  });

  it('should detect statistical Z-score outliers', () => {
    // Normal readings around 22 C
    for (let i = 0; i < 15; i++) {
      detector.evaluateReading('SEN-TEMP-01', 'temperature_c', 22.0 + (Math.sin(i) * 0.2));
    }

    // Normal point
    const normalRes = detector.evaluateReading('SEN-TEMP-01', 'temperature_c', 22.1);
    expect(normalRes.isAnomaly).toBe(false);

    // Extreme spike (e.g. 50 C)
    const spikeRes = detector.evaluateReading('SEN-TEMP-01', 'temperature_c', 50.0);
    expect(spikeRes.isAnomaly).toBe(true);
    expect(spikeRes.severity).toBe('critical');
    expect(spikeRes.reason).toContain('Extreme statistical anomaly');
  });

  it('should evaluate sensor health and detect stale heartbeat', async () => {
    await dbStore.createSensor({
      sensorId: 'SEN-AIR-STALE',
      facilityId: 'FAC-01',
      samplingIntervalSeconds: 30,
      lastHeartbeat: new Date(Date.now() - 300000).toISOString(), // 5 minutes ago
      batteryPercent: 88,
      status: 'online',
      institutionId: 'inst_01',
    });

    const status = await monitor.evaluateSensorHealth('SEN-AIR-STALE', 'inst_01');
    expect(status).toBeDefined();
    expect(status?.isStale).toBe(true);
    expect(status?.status).toBe('offline');
    expect(status?.healthGrade).toBe('F');

    // Should have auto-created a maintenance order
    const orders = await dbStore.listMaintenanceOrders('inst_01');
    expect(orders.length).toBe(1);
    expect(orders[0].sensorId).toBe('SEN-AIR-STALE');
  });

  it('should flag low battery sensor and trigger maintenance order', async () => {
    await dbStore.createSensor({
      sensorId: 'SEN-BATT-LOW',
      facilityId: 'FAC-01',
      samplingIntervalSeconds: 60,
      batteryPercent: 8,
      status: 'online',
      institutionId: 'inst_01',
    });

    monitor.recordHeartbeat('SEN-BATT-LOW', Date.now());

    const status = await monitor.evaluateSensorHealth('SEN-BATT-LOW', 'inst_01');
    expect(status).toBeDefined();
    expect(status?.batteryPercent).toBe(8);
    expect(status?.status).toBe('degraded');
    expect(status?.issues.some((i) => i.includes('Low battery'))).toBe(true);

    const orders = await dbStore.listMaintenanceOrders('inst_01');
    expect(orders.length).toBe(1);
    expect(orders[0].priority).toBe('high');
  });
});
