import { facilityStreamManager } from '../../../operations/facility/streaming/facility-stream-manager';

describe('Real-Time Facilities Telemetry Stream Manager (Sprint-052 FACILITY-012)', () => {
  it('should manage subscriptions and broadcast events with tenant isolation', () => {
    const receivedAlpha: any[] = [];
    const receivedBeta: any[] = [];

    const unsubscribeAlpha = facilityStreamManager.subscribe('inst_alpha', (evt) => {
      receivedAlpha.push(evt);
    });

    const unsubscribeBeta = facilityStreamManager.subscribe('inst_beta', (evt) => {
      receivedBeta.push(evt);
    });

    // Broadcast to Alpha
    facilityStreamManager.broadcast({
      eventType: 'anomaly_alert',
      timestamp: new Date().toISOString(),
      institutionId: 'inst_alpha',
      data: { alertId: 'ALT_TEST_01', severity: 'critical' },
    });

    expect(receivedAlpha.length).toBe(1);
    expect(receivedAlpha[0].data.alertId).toBe('ALT_TEST_01');
    expect(receivedBeta.length).toBe(0);

    // Unsubscribe Alpha
    unsubscribeAlpha();
    unsubscribeBeta();
  });
});
