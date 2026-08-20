import { FallbackEngine } from '../../../operations/engage/fallback-engine';
import { EngageDbStore } from '../../../db/engage-store';
import { OutboundDispatchPayload, DispatchResult } from '../../../operations/engage/engage-types';

describe('EngageOS FallbackEngine & Cascading Routing Tests', () => {
  let fallbackEngine: FallbackEngine;
  let store: EngageDbStore;

  beforeEach(() => {
    fallbackEngine = FallbackEngine.getInstance();
    store = EngageDbStore.getInstance();
    store.clearMemoryStore();
  });

  it('should compute next fallback channel according to priority hierarchy', () => {
    // Critical: voice -> sms -> push -> email
    expect(fallbackEngine.getNextFallbackChannel('voice', 'critical', ['voice'])).toBe('sms');
    expect(fallbackEngine.getNextFallbackChannel('sms', 'critical', ['voice', 'sms'])).toBe('push');
    expect(fallbackEngine.getNextFallbackChannel('push', 'critical', ['voice', 'sms', 'push'])).toBe('email');

    // High: push -> sms -> email -> inapp
    expect(fallbackEngine.getNextFallbackChannel('push', 'high', ['push'])).toBe('sms');
  });

  it('should execute fallback cascade to next channel upon primary failure', async () => {
    const originalPayload: OutboundDispatchPayload = {
      messageId: 'msg_cascade_01',
      recipientId: 'parent_101',
      recipientChannelAddress: 'invalid-email',
      channel: 'email',
      priority: 'high',
      body: 'Urgent: Student pickup requested',
      institutionId: 'inst_test',
    };

    const failedResult: DispatchResult = {
      success: false,
      deliveryId: 'deliv_failed_email',
      messageId: 'msg_cascade_01',
      channel: 'email',
      provider: 'aws-ses',
      status: 'failed',
      failureReason: 'Invalid email address format',
      costUsd: 0,
      dispatchedAt: new Date().toISOString(),
    };

    const fallbackResult = await fallbackEngine.executeFallbackCascade(
      originalPayload,
      failedResult,
      { sms: '+14155550199' },
      ['email']
    );

    expect(fallbackResult.fallbackTriggered).toBe(true);
    expect(fallbackResult.channel).toBe('inapp'); // High fallback from email -> inapp
    expect(fallbackResult.success).toBe(true);
  });

  it('should stop fallback cascade when max hop limit is reached', async () => {
    const originalPayload: OutboundDispatchPayload = {
      messageId: 'msg_max_hops',
      recipientId: 'user_999',
      recipientChannelAddress: 'addr',
      channel: 'email',
      body: 'Testing hops',
    };

    const failedResult: DispatchResult = {
      success: false,
      deliveryId: 'deliv_3',
      messageId: 'msg_max_hops',
      channel: 'push',
      provider: 'fcm',
      status: 'failed',
      costUsd: 0,
      dispatchedAt: new Date().toISOString(),
    };

    const result = await fallbackEngine.executeFallbackCascade(
      originalPayload,
      failedResult,
      {},
      ['email', 'sms', 'push'] // 3 hops attempted
    );

    expect(result.success).toBe(false);
    expect(result.failureReason).toContain('Max fallback hop limit reached');
  });
});
