import { DispatchEngine } from '../../../operations/engage/dispatch-engine';
import { EngageDbStore } from '../../../db/engage-store';

describe('EngageOS DispatchEngine & Multi-Channel Adapters', () => {
  let engine: DispatchEngine;
  let store: EngageDbStore;

  beforeEach(() => {
    engine = DispatchEngine.getInstance();
    store = EngageDbStore.getInstance();
    store.clearMemoryStore();
  });

  it('should dispatch email via EmailAdapter successfully', async () => {
    const result = await engine.dispatchMessage({
      messageId: 'msg_test_email_01',
      recipientId: 'user_101',
      recipientChannelAddress: 'parent@example.com',
      channel: 'email',
      subject: 'Quarterly Attendance Report',
      body: 'Your student attended 92% of classes this quarter.',
      institutionId: 'inst_test',
    });

    expect(result.success).toBe(true);
    expect(result.channel).toBe('email');
    expect(result.status).toBe('sent');
    expect(result.provider).toBe('aws-ses');
    expect(result.costUsd).toBeGreaterThan(0);

    const savedDelivery = await store.getDeliveryAsync(result.deliveryId, 'inst_test');
    expect(savedDelivery).toBeDefined();
    expect(savedDelivery?.channel).toBe('email');
  });

  it('should fail gracefully on invalid email format', async () => {
    const result = await engine.dispatchMessage({
      messageId: 'msg_test_email_invalid',
      recipientId: 'user_102',
      recipientChannelAddress: 'invalid-email-address',
      channel: 'email',
      body: 'Test body',
      institutionId: 'inst_test',
    });

    expect(result.success).toBe(false);
    expect(result.status).toBe('failed');
    expect(result.failureReason).toContain('Invalid email');
  });

  it('should dispatch SMS via SmsAdapter with E.164 phone number', async () => {
    const result = await engine.dispatchMessage({
      messageId: 'msg_test_sms_01',
      recipientId: 'user_103',
      recipientChannelAddress: '+14155552671',
      channel: 'sms',
      body: 'Campus bus arriving in 5 minutes.',
      institutionId: 'inst_test',
    });

    expect(result.success).toBe(true);
    expect(result.channel).toBe('sms');
    expect(result.provider).toBe('twilio-sms');
  });

  it('should dispatch Push notification via PushAdapter', async () => {
    const result = await engine.dispatchMessage({
      messageId: 'msg_test_push_01',
      recipientId: 'user_104',
      recipientChannelAddress: 'fcm_token_device_xyz_987654321',
      channel: 'push',
      body: 'New grade posted for Physics 101.',
      institutionId: 'inst_test',
    });

    expect(result.success).toBe(true);
    expect(result.channel).toBe('push');
    expect(result.status).toBe('delivered');
  });

  it('should dispatch In-App message via InAppAdapter', async () => {
    const result = await engine.dispatchMessage({
      messageId: 'msg_test_inapp_01',
      recipientId: 'user_105',
      recipientChannelAddress: 'user_105',
      channel: 'inapp',
      body: 'Library book due tomorrow.',
      institutionId: 'inst_test',
    });

    expect(result.success).toBe(true);
    expect(result.channel).toBe('inapp');
    expect(result.status).toBe('delivered');
  });

  it('should dispatch Voice IVR call via VoiceAdapter', async () => {
    const result = await engine.dispatchMessage({
      messageId: 'msg_test_voice_01',
      recipientId: 'user_106',
      recipientChannelAddress: '+14155559999',
      channel: 'voice',
      body: 'Emergency weather advisory: campus closing at 2pm.',
      institutionId: 'inst_test',
    });

    expect(result.success).toBe(true);
    expect(result.channel).toBe('voice');
    expect(result.provider).toBe('twilio-voice');
  });
});
