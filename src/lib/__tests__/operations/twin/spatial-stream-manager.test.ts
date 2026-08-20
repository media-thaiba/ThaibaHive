import { SpatialStreamManager, SpatialStreamMessage } from '../../../operations/twin/streaming/spatial-stream-manager';

describe('Spatial Stream Manager & Live Push Broadcast', () => {
  let streamManager: SpatialStreamManager;

  beforeEach(() => {
    streamManager = SpatialStreamManager.getInstance();
    streamManager.clear();
  });

  it('should register subscriber and route topic messages', () => {
    const receivedMessages: SpatialStreamMessage[] = [];

    streamManager.registerSubscriber(
      'sub_client_1',
      'inst_01',
      ['facility:FAC-ENG', 'emergency'],
      (msg) => {
        receivedMessages.push(msg);
      }
    );

    expect(streamManager.getActiveSubscribersCount('inst_01')).toBe(1);

    // Broadcast to matching topic
    const count = streamManager.broadcastTelemetry(
      {
        telemetryId: 'TEL-01',
        sensorId: 'SEN-01',
        facilityId: 'FAC-ENG',
        metricType: 'temperature_c',
        value: 22.5,
        unit: '°C',
        isAnomaly: false,
        timestamp: new Date().toISOString(),
      },
      'inst_01'
    );

    expect(count).toBe(1);
    expect(receivedMessages.length).toBe(1);
    expect(receivedMessages[0].data.value).toBe(22.5);
  });

  it('should filter messages by tenant and topic isolation', () => {
    const messagesAlpha: SpatialStreamMessage[] = [];
    const messagesBeta: SpatialStreamMessage[] = [];

    streamManager.registerSubscriber('sub_alpha', 'inst_alpha', ['facility:FAC-01'], (msg) => messagesAlpha.push(msg));
    streamManager.registerSubscriber('sub_beta', 'inst_beta', ['facility:FAC-01'], (msg) => messagesBeta.push(msg));

    streamManager.broadcastTelemetry(
      {
        telemetryId: 'TEL-ALPHA',
        sensorId: 'SEN-01',
        facilityId: 'FAC-01',
        metricType: 'co2_ppm',
        value: 450,
        unit: 'ppm',
        isAnomaly: false,
        timestamp: new Date().toISOString(),
      },
      'inst_alpha'
    );

    expect(messagesAlpha.length).toBe(1);
    expect(messagesBeta.length).toBe(0); // Beta received zero
  });
});
