import { EngagementAggregator } from '../../../../operations/engage/analytics/engagement-aggregator';
import { EngageDbStore } from '../../../../db/engage-store';

describe('EngageOS EngagementAggregator Tests', () => {
  let aggregator: EngagementAggregator;
  let store: EngageDbStore;

  beforeEach(() => {
    aggregator = EngagementAggregator.getInstance();
    store = EngageDbStore.getInstance();
    store.clearMemoryStore();
  });

  it('should compute aggregate funnel metrics and channel breakdown', async () => {
    // Record dispatches, deliveries, opens
    await store.recordAnalyticsEventAsync({
      eventId: 'e1',
      eventType: 'dispatch',
      channel: 'email',
      institutionId: 'inst_test',
    });
    await store.recordAnalyticsEventAsync({
      eventId: 'e2',
      eventType: 'delivery',
      channel: 'email',
      institutionId: 'inst_test',
    });
    await store.recordAnalyticsEventAsync({
      eventId: 'e3',
      eventType: 'open',
      channel: 'email',
      institutionId: 'inst_test',
    });

    const overview = await aggregator.getOverview('inst_test');

    expect(overview.funnel.delivered).toBe(1);
    expect(overview.funnel.opened).toBe(1);
    expect(overview.channelBreakdown.length).toBe(5);
    expect(overview.hourlyHeatmap.length).toBe(168); // 7 days * 24 hours
  });
});
