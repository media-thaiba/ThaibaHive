import { FrequencyCapper } from '../../../operations/engage/frequency-capper';
import { EngageDbStore } from '../../../db/engage-store';

describe('EngageOS FrequencyCapper Anti-Fatigue Throttler Tests', () => {
  let capper: FrequencyCapper;
  let store: EngageDbStore;

  beforeEach(() => {
    capper = FrequencyCapper.getInstance();
    store = EngageDbStore.getInstance();
    store.clearMemoryStore();
  });

  it('should allow initial message when under daily limit', async () => {
    const result = await capper.checkFrequencyCap('user_student_1', 'sms', 'standard', 'inst_test');
    expect(result.allowed).toBe(true);
    expect(result.dispatchesInWindow).toBe(0);
  });

  it('should block non-critical messages when daily cap is exceeded', async () => {
    // Seed 2 recent SMS messages (default limit = 2)
    await store.saveMessageAsync({
      messageId: 'msg_recent_1',
      recipientId: 'user_student_2',
      channel: 'sms',
      priority: 'standard',
      body: 'SMS 1',
      institutionId: 'inst_test',
    });
    await store.saveMessageAsync({
      messageId: 'msg_recent_2',
      recipientId: 'user_student_2',
      channel: 'sms',
      priority: 'standard',
      body: 'SMS 2',
      institutionId: 'inst_test',
    });

    const result = await capper.checkFrequencyCap('user_student_2', 'sms', 'standard', 'inst_test');
    expect(result.allowed).toBe(false);
    expect(result.reason).toContain('Frequency cap exceeded');
  });

  it('should always allow critical emergency alerts regardless of past message counts', async () => {
    // Seed 5 messages
    for (let i = 0; i < 5; i++) {
      await store.saveMessageAsync({
        messageId: `msg_bulk_${i}`,
        recipientId: 'user_student_3',
        channel: 'sms',
        priority: 'standard',
        body: `SMS ${i}`,
        institutionId: 'inst_test',
      });
    }

    const result = await capper.checkFrequencyCap('user_student_3', 'sms', 'critical', 'inst_test');
    expect(result.allowed).toBe(true);
  });
});
