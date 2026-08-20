import { SendTimeOptimizer } from '../../../operations/engage/send-time-optimizer';
import { EngageDbStore } from '../../../db/engage-store';

describe('EngageOS SendTimeOptimizer Tests', () => {
  let optimizer: SendTimeOptimizer;
  let store: EngageDbStore;

  beforeEach(() => {
    optimizer = SendTimeOptimizer.getInstance();
    store = EngageDbStore.getInstance();
    store.clearMemoryStore();
  });

  it('should defer messages falling inside quiet hours to next morning window', async () => {
    await store.savePreferencesAsync({
      recipientId: 'user_quiet',
      quietHoursStart: '21:00',
      quietHoursEnd: '07:00',
      institutionId: 'inst_test',
    });

    // 23:30 (11:30 PM) is in quiet hours
    const nightTime = new Date('2026-08-20T23:30:00.000Z');
    const result = await optimizer.computeOptimalSendTime('user_quiet', nightTime, 'inst_test');

    expect(result.isDelayedForQuietHours).toBe(true);
    expect(result.reason).toContain('quiet hours');
    const adjustedHour = new Date(result.optimalSendTime).getUTCHours();
    expect(adjustedHour).toBe(7); // Adjusted to 07:15
  });

  it('should allow daytime messages without deferral', async () => {
    // 14:00 (2:00 PM) is outside quiet hours
    const dayTime = new Date('2026-08-20T14:00:00.000Z');
    const result = await optimizer.computeOptimalSendTime('user_daytime', dayTime, 'inst_test');

    expect(result.isDelayedForQuietHours).toBe(false);
  });
});
