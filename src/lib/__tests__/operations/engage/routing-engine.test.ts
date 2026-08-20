import { RoutingEngine } from '../../../operations/engage/routing-engine';
import { EngageDbStore } from '../../../db/engage-store';

describe('EngageOS Multi-Factor Intelligent RoutingEngine', () => {
  let routingEngine: RoutingEngine;
  let store: EngageDbStore;

  beforeEach(() => {
    routingEngine = RoutingEngine.getInstance();
    store = EngageDbStore.getInstance();
    store.clearMemoryStore();
  });

  it('should select high-speed channels (Voice/SMS) for critical priority alerts', async () => {
    const decision = await routingEngine.determineOptimalChannel({
      recipientId: 'student_999',
      priority: 'critical',
      institutionId: 'inst_test',
    });

    expect(['voice', 'sms']).toContain(decision.selectedChannel);
    expect(decision.urgencyWeight).toBe(1.0);
    expect(decision.channelScores[decision.selectedChannel]).toBeGreaterThan(0);
  });

  it('should select cost-effective channels (In-App / Email) for low priority notifications', async () => {
    const decision = await routingEngine.determineOptimalChannel({
      recipientId: 'student_999',
      priority: 'low',
      institutionId: 'inst_test',
    });

    expect(['inapp', 'email']).toContain(decision.selectedChannel);
  });

  it('should respect recipient channel opt-out preferences for non-emergency traffic', async () => {
    await store.savePreferencesAsync({
      recipientId: 'parent_no_sms',
      channelPreferences: { sms: false, email: true, push: true, inapp: true },
      institutionId: 'inst_test',
    });

    const decision = await routingEngine.determineOptimalChannel({
      recipientId: 'parent_no_sms',
      priority: 'high',
      institutionId: 'inst_test',
    });

    expect(decision.selectedChannel).not.toBe('sms');
    expect(decision.channelScores.sms).toBe(-100);
  });
});
