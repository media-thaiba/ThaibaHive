import { DeliveryTracker } from '../../../operations/engage/delivery-tracker';
import { EngageDbStore } from '../../../db/engage-store';

describe('EngageOS DeliveryTracker Tests', () => {
  let tracker: DeliveryTracker;
  let store: EngageDbStore;

  beforeEach(() => {
    tracker = DeliveryTracker.getInstance();
    store = EngageDbStore.getInstance();
    store.clearMemoryStore();
  });

  it('should update delivery status and record analytics event', async () => {
    await store.saveDeliveryAsync({
      deliveryId: 'deliv_track_01',
      messageId: 'msg_01',
      channel: 'email',
      provider: 'aws-ses',
      status: 'sent',
      institutionId: 'inst_test',
    });

    const updated = await tracker.updateDeliveryStatus({
      deliveryId: 'deliv_track_01',
      status: 'opened',
      providerMessageId: 'ses_12345',
      institutionId: 'inst_test',
    });

    expect(updated).toBe(true);

    const delivery = await store.getDeliveryAsync('deliv_track_01', 'inst_test');
    expect(delivery?.status).toBe('opened');
    expect(delivery?.openedAt).toBeDefined();

    const events = await store.listAnalyticsEventsAsync('inst_test');
    expect(events.length).toBe(1);
    expect(events[0].eventType).toBe('opened');
  });

  it('should detect delivery timeouts for unacknowledged messages', async () => {
    const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();
    await store.saveDeliveryAsync({
      deliveryId: 'deliv_timeout_01',
      messageId: 'msg_02',
      channel: 'push',
      provider: 'fcm',
      status: 'sent',
      dispatchedAt: tenMinutesAgo,
      institutionId: 'inst_test',
    });

    const isTimedOut = await tracker.isDeliveryTimedOut('deliv_timeout_01', 5, 'inst_test');
    expect(isTimedOut).toBe(true);

    const isNotTimedOut = await tracker.isDeliveryTimedOut('deliv_timeout_01', 15, 'inst_test');
    expect(isNotTimedOut).toBe(false);
  });
});
