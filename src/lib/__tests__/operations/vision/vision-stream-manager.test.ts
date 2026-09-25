import { VisionStreamManager } from '../../../operations/vision/streaming/vision-stream-manager';

describe('VisionStreamManager Real-Time Event Subscription & Broadcasting', () => {
  let manager: VisionStreamManager;

  beforeEach(() => {
    manager = VisionStreamManager.getInstance();
    manager.clear();
  });

  it('should subscribe clients and broadcast topic-specific events', () => {
    const receivedAlerts: any[] = [];
    const receivedHealth: any[] = [];

    manager.subscribe('client_01', 'tenant_alpha', ['security:alerts'], (topic, data) => {
      receivedAlerts.push({ topic, data });
    });

    manager.subscribe('client_02', 'tenant_alpha', ['camera:health'], (topic, data) => {
      receivedHealth.push({ topic, data });
    });

    const alertPayload = { alertId: 'alt_99', severity: 'critical' };
    const delivered = manager.broadcast('security:alerts', alertPayload, 'tenant_alpha');

    expect(delivered).toBe(1);
    expect(receivedAlerts.length).toBe(1);
    expect(receivedAlerts[0].data.alertId).toBe('alt_99');
    expect(receivedHealth.length).toBe(0);
  });

  it('should respect tenant isolation during broadcast', () => {
    let betaReceived = false;

    manager.subscribe('client_beta', 'tenant_beta', ['*'], () => {
      betaReceived = true;
    });

    manager.broadcast('security:alerts', { text: 'Alpha threat' }, 'tenant_alpha');
    expect(betaReceived).toBe(false);
  });
});
