import { EnergyStreamManager, EnergyStreamMessage } from '../../../operations/eco/streaming/energy-stream-manager';

describe('EnergyStreamManager Unit Tests', () => {
  let streamManager: EnergyStreamManager;

  beforeEach(() => {
    streamManager = EnergyStreamManager.getInstance();
  });

  it('should register subscriber, filter by topic, and broadcast messages', () => {
    const receivedMessages: EnergyStreamMessage[] = [];
    const sub = streamManager.registerSubscriber(
      'sub_client_01',
      'inst_alpha',
      ['grid:live', 'solar:generation'],
      (msg) => {
        receivedMessages.push(msg);
      }
    );

    expect(sub.id).toBe('sub_client_01');
    expect(streamManager.getActiveConnectionCount('inst_alpha')).toBeGreaterThanOrEqual(1);

    // Broadcast matching topic -> received
    const sentCount1 = streamManager.broadcast(
      {
        type: 'power_flow_update',
        topic: 'grid:live',
        data: { solarKw: 120, loadKw: 100 },
        timestamp: new Date().toISOString(),
      },
      'inst_alpha'
    );
    expect(sentCount1).toBeGreaterThanOrEqual(1);
    expect(receivedMessages).toHaveLength(1);

    // Broadcast non-subscribed topic -> ignored
    streamManager.broadcast(
      {
        type: 'ev_charging_update',
        topic: 'ev:charging',
        data: { activeChargers: 4 },
        timestamp: new Date().toISOString(),
      },
      'inst_alpha'
    );
    expect(receivedMessages).toHaveLength(1);

    // Dynamic topic subscription
    streamManager.subscribeTopic('sub_client_01', 'ev:charging');
    streamManager.broadcast(
      {
        type: 'ev_charging_update',
        topic: 'ev:charging',
        data: { activeChargers: 5 },
        timestamp: new Date().toISOString(),
      },
      'inst_alpha'
    );
    expect(receivedMessages).toHaveLength(2);

    // Clean unregister
    streamManager.unregisterSubscriber('sub_client_01');
  });
});
