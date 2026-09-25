import { sensorIngestionGateway } from '../../../operations/facility/ingestion/sensor-ingestion-gateway';
import { facilityStore } from '../../../db/facility-store';

describe('Multi-Protocol Sensor Ingestion Gateway (Sprint-052 FACILITY-003)', () => {
  beforeEach(() => {
    facilityStore.clearMemoryStore();
  });

  it('should ingest and normalize MQTT telemetry payloads', async () => {
    const res = await sensorIngestionGateway.ingestPacket(
      {
        protocol: 'mqtt',
        sensorId: 'SENSOR_MQTT_TEMP_01',
        equipmentId: 'EQUIP_AHU_1',
        payload: { temperature: 75.2, unit: 'fahrenheit' },
      },
      'inst_alpha'
    );

    expect(res.success).toBe(true);
    expect(res.normalized?.sensorType).toBe('temperature');
    expect(res.normalized?.unit).toBe('celsius');
    // 75.2°F = 24.0°C
    expect(res.normalized?.value).toBeCloseTo(24.0, 1);
  });

  it('should ingest and normalize Modbus power meter payloads', async () => {
    const res = await sensorIngestionGateway.ingestPacket(
      {
        protocol: 'modbus',
        sensorId: 'METER_MODBUS_MAIN_01',
        equipmentId: 'SUBSTATION_NORTH',
        payload: { register_value: 45200, multiplier: 0.001, register_type: 'power' },
      },
      'inst_alpha'
    );

    expect(res.success).toBe(true);
    expect(res.normalized?.sensorType).toBe('power_draw');
    expect(res.normalized?.value).toBe(45.2);
    expect(res.normalized?.unit).toBe('kw');
  });

  it('should ingest BACnet AHU filter delta pressure payloads', async () => {
    const res = await sensorIngestionGateway.ingestPacket(
      {
        protocol: 'bacnet',
        sensorId: 'BACNET_FILTER_DP_01',
        equipmentId: 'AHU_ROOF_02',
        payload: { present_value: 185.5, object_type: 'analog-input-filter-dp', units: 'pascals' },
      },
      'inst_alpha'
    );

    expect(res.success).toBe(true);
    expect(res.normalized?.sensorType).toBe('filter_delta_p');
    expect(res.normalized?.value).toBe(185.5);
    expect(res.normalized?.unit).toBe('pa');
  });

  it('should apply deadband filtering on negligible sensor changes', async () => {
    // Register sensor with 2.0% deadband
    await facilityStore.registerSensor({
      sensorId: 'TEMP_DEADBAND_01',
      equipmentId: 'CHILLER_01',
      sensorType: 'temperature',
      deadbandPercent: 2.0,
      institutionId: 'inst_alpha',
    });

    const res1 = await sensorIngestionGateway.ingestPacket(
      {
        protocol: 'rest',
        sensorId: 'TEMP_DEADBAND_01',
        payload: { value: 100.0, unit: 'celsius' },
      },
      'inst_alpha'
    );
    expect(res1.filteredOut).toBe(false);

    // 0.5% change (< 2.0% deadband) -> filtered
    const res2 = await sensorIngestionGateway.ingestPacket(
      {
        protocol: 'rest',
        sensorId: 'TEMP_DEADBAND_01',
        payload: { value: 100.5, unit: 'celsius' },
      },
      'inst_alpha'
    );
    expect(res2.filteredOut).toBe(true);

    // 5.0% change (> 2.0% deadband) -> not filtered
    const res3 = await sensorIngestionGateway.ingestPacket(
      {
        protocol: 'rest',
        sensorId: 'TEMP_DEADBAND_01',
        payload: { value: 105.5, unit: 'celsius' },
      },
      'inst_alpha'
    );
    expect(res3.filteredOut).toBe(false);
  });
});
