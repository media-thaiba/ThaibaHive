import { ConsentManager } from '../../../../operations/engage/privacy/consent-manager';
import { PreferenceService } from '../../../../operations/engage/privacy/preference-service';
import { EngageDbStore } from '../../../../db/engage-store';

describe('EngageOS ConsentManager & PreferenceService Tests', () => {
  let consentManager: ConsentManager;
  let preferenceService: PreferenceService;
  let store: EngageDbStore;

  beforeEach(() => {
    consentManager = ConsentManager.getInstance();
    preferenceService = PreferenceService.getInstance();
    store = EngageDbStore.getInstance();
    store.clearMemoryStore();
  });

  it('should validate consent opt-in and block dispatches when opted-out', async () => {
    await store.savePreferencesAsync({
      recipientId: 'parent_optout_sms',
      channelPreferences: { sms: false, email: true },
      institutionId: 'inst_test',
    });

    const smsRes = await consentManager.validateDispatchConsent(
      'parent_optout_sms',
      'sms',
      'general',
      'standard',
      'inst_test'
    );
    expect(smsRes.hasConsent).toBe(false);
    expect(smsRes.reason).toContain('opted out of channel: SMS');

    const emailRes = await consentManager.validateDispatchConsent(
      'parent_optout_sms',
      'email',
      'general',
      'standard',
      'inst_test'
    );
    expect(emailRes.hasConsent).toBe(true);
  });

  it('should allow critical emergency messages regardless of opt-out preferences', async () => {
    await store.savePreferencesAsync({
      recipientId: 'user_unsub_all',
      isUnsubscribedAll: true,
      institutionId: 'inst_test',
    });

    const emergencyRes = await consentManager.validateDispatchConsent(
      'user_unsub_all',
      'sms',
      'general',
      'critical',
      'inst_test'
    );
    expect(emergencyRes.hasConsent).toBe(true);
    expect(emergencyRes.isEmergencyOverride).toBe(true);
  });

  it('should generate and verify HMAC unsubscribe tokens', () => {
    const token = preferenceService.generateUnsubscribeToken('student_777', 'inst_test');
    expect(token).toBeDefined();

    const verification = preferenceService.verifyUnsubscribeToken(token);
    expect(verification.valid).toBe(true);
    expect(verification.recipientId).toBe('student_777');
    expect(verification.institutionId).toBe('inst_test');
  });
});
