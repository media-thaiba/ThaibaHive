import { ProtocolAdapters } from '../../../operations/twin/iot/protocol-adapters';
import { TelemetryIngester } from '../../../operations/twin/iot/telemetry-ingester';
import { TwinDbStore } from '../../../db/twin-store';

describe('IoT Protocol Adapters & Telemetry Ingester', () => {
  let ingester: TelemetryIngester;
  let dbStore: TwinDbStore;

  beforeEach(() => {
    dbStore = TwinDbStore.getInstance();
    dbStore.clearMemoryStore();
    ingester = TelemetryIngester.getInstance();
    ingester.clearBuffer();
  });

  it('should parse MQTT messages with standard topic hierarchies', () => {
    const mqttMsg = {
      topic: 'campus/inst_01/FAC-01/SPC-101/SEN-AIR-01/co2',
      payload: JSON.stringify({ val: 620, unit: 'ppm' }),
    };

    const frames = ProtocolAdapters.parseMqtt(mqttMsg);
    expect(frames.length).toBe(1);
    expect(frames[0].sensorId).toBe('SEN-AIR-01');
    expect(frames[0].spaceId).toBe('SPC-101');
    expect(frames[0].metricType).toBe('co2_ppm');
    expect(frames[0].value).toBe(620);
    expect(frames[0].unit).toBe('ppm');
  });

  it('should normalize Fahrenheit temperatures to Celsius', () => {
    const norm = ProtocolAdapters.normalizeMetricValue('temperature_c', 77.0, 'F');
    expect(norm).toBe(25.0);
  });

  it('should parse CoAP messages with multi-metric payload', () => {
    const coapMsg = {
      path: '/sensors/FAC-01/SEN-MULTI-01',
      code: '2.05',
      payload: {
        temperature: 23.5,
        humidity: 48.0,
      },
    };

    const frames = ProtocolAdapters.parseCoap(coapMsg);
    expect(frames.length).toBe(2);
    expect(frames.find((f) => f.metricType === 'temperature_c')?.value).toBe(23.5);
    expect(frames.find((f) => f.metricType === 'humidity_pct')?.value).toBe(48.0);
  });

  it('should parse Webhook batch payloads', () => {
    const webhook = {
      gatewayId: 'GW-ZIGBEE-01',
      readings: [
        { sensorId: 'SEN-01', metric: 'noise', value: 42.5 },
        { sensorId: 'SEN-02', metric: 'occupancy', value: 18 },
      ],
    };

    const frames = ProtocolAdapters.parseWebhook(webhook);
    expect(frames.length).toBe(2);
    expect(frames[0].metricType).toBe('noise_db');
    expect(frames[1].metricType).toBe('occupancy_count');
    expect(frames[1].value).toBe(18);
  });

  it('should ingest telemetry frame, store in DB, and compute comfort score', async () => {
    await dbStore.createFacility({
      facilityId: 'FAC-ENG',
      name: 'Engineering Hall',
      code: 'ENG',
      institutionId: 'inst_01',
    });

    await dbStore.createSpace({
      spaceId: 'SPC-ENG-101',
      facilityId: 'FAC-ENG',
      name: 'Seminar Room A',
      code: 'ENG-101',
      capacity: 50,
      institutionId: 'inst_01',
    });

    await dbStore.createSensor({
      sensorId: 'SEN-AIR-ENG',
      facilityId: 'FAC-ENG',
      spaceId: 'SPC-ENG-101',
      sensorType: 'co2',
      institutionId: 'inst_01',
    });

    await ingester.ingestFrame(
      {
        sensorId: 'SEN-AIR-ENG',
        facilityId: 'FAC-ENG',
        spaceId: 'SPC-ENG-101',
        metricType: 'co2_ppm',
        value: 520,
        unit: 'ppm',
      },
      { tenantId: 'inst_01' }
    );

    const space = await dbStore.getSpaceById('SPC-ENG-101', 'inst_01');
    expect(space).toBeDefined();
    expect(space?.comfortScore).toBeGreaterThan(80);
  });

  it('should calculate environmental comfort score accurately across dimensions', () => {
    const optimal = ingester.computeSpaceComfortScore(22, 450, 38, 0.4);
    expect(optimal.overallScore).toBeGreaterThanOrEqual(95);

    const degraded = ingester.computeSpaceComfortScore(29, 1600, 75, 0.9);
    expect(degraded.overallScore).toBeLessThan(60);
    expect(degraded.recommendation).toContain('ventilation');
  });
});
