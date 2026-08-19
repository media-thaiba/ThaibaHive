import { triggerDeduplicator } from '@/lib/security/soar/trigger-deduplicator';

describe('TriggerDeduplicator', () => {
  beforeEach(() => {
    triggerDeduplicator.reset();
  });

  it('should allow first trigger and suppress duplicates within cooldown', () => {
    const key = 'ip:198.51.100.10';

    // First trigger -> NOT duplicate
    expect(triggerDeduplicator.isDuplicate(key, { cooldownMs: 1000 })).toBe(false);

    // Immediate second trigger -> IS duplicate
    expect(triggerDeduplicator.isDuplicate(key, { cooldownMs: 1000 })).toBe(true);
  });

  it('should allow trigger again after cooldown expires', async () => {
    const key = 'ip:short-cooldown';

    expect(triggerDeduplicator.isDuplicate(key, { cooldownMs: 20 })).toBe(false);
    expect(triggerDeduplicator.isDuplicate(key, { cooldownMs: 20 })).toBe(true);

    await new Promise(resolve => setTimeout(resolve, 30));
    expect(triggerDeduplicator.isDuplicate(key, { cooldownMs: 20 })).toBe(false);
  });

  it('should allow resetting single key or entire cache', () => {
    const key1 = 'user:1';
    const key2 = 'user:2';

    triggerDeduplicator.isDuplicate(key1, { cooldownMs: 5000 });
    triggerDeduplicator.isDuplicate(key2, { cooldownMs: 5000 });

    expect(triggerDeduplicator.isDuplicate(key1, { cooldownMs: 5000 })).toBe(true);
    expect(triggerDeduplicator.isDuplicate(key2, { cooldownMs: 5000 })).toBe(true);

    triggerDeduplicator.reset(key1);
    expect(triggerDeduplicator.isDuplicate(key1, { cooldownMs: 5000 })).toBe(false);
    expect(triggerDeduplicator.isDuplicate(key2, { cooldownMs: 5000 })).toBe(true);
  });
});
