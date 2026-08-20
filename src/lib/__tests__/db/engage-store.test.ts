import { EngageDbStore } from '../../db/engage-store';

describe('EngageDbStore Multi-Tenant Persistence Tests', () => {
  let store: EngageDbStore;

  beforeEach(() => {
    store = EngageDbStore.getInstance();
    store.clearMemoryStore();
  });

  it('should save and retrieve templates with tenant isolation', async () => {
    await store.saveTemplateAsync({
      templateId: 'tmpl_fee_reminder_01',
      name: 'Semester Fee Reminder',
      category: 'financial',
      channel: 'email',
      subjectTemplate: 'Notice: Tuition Fee Due for {{student.name}}',
      bodyTemplate: 'Dear Parent, fee of {{fee.amount}} is due on {{fee.dueDate}}.',
      institutionId: 'inst_alpha',
    });

    const alphaTmpl = await store.getTemplateAsync('tmpl_fee_reminder_01', 'inst_alpha');
    expect(alphaTmpl).toBeDefined();
    expect(alphaTmpl?.name).toBe('Semester Fee Reminder');

    // Different tenant should not find it
    const betaTmpl = await store.getTemplateAsync('tmpl_fee_reminder_01', 'inst_beta');
    expect(betaTmpl).toBeNull();
  });

  it('should save and retrieve messages and deliveries', async () => {
    await store.saveMessageAsync({
      messageId: 'msg_001',
      recipientId: 'student_123',
      recipientChannelAddress: 'student@example.com',
      channel: 'email',
      priority: 'high',
      body: 'Important exam alert',
      institutionId: 'inst_alpha',
    });

    const msg = await store.getMessageAsync('msg_001', 'inst_alpha');
    expect(msg).toBeDefined();
    expect(msg?.recipientId).toBe('student_123');

    await store.saveDeliveryAsync({
      deliveryId: 'deliv_001',
      messageId: 'msg_001',
      channel: 'email',
      provider: 'sendgrid',
      status: 'delivered',
      costUsd: 0.001,
      institutionId: 'inst_alpha',
    });

    const deliv = await store.getDeliveryAsync('deliv_001', 'inst_alpha');
    expect(deliv).toBeDefined();
    expect(deliv?.status).toBe('delivered');
  });

  it('should store stakeholder preferences and quiet hours', async () => {
    await store.savePreferencesAsync({
      recipientId: 'parent_99',
      recipientType: 'parent',
      channelPreferences: { email: true, sms: true, push: false },
      quietHoursStart: '22:00',
      quietHoursEnd: '06:00',
      institutionId: 'inst_alpha',
    });

    const pref = await store.getPreferencesAsync('parent_99', 'inst_alpha');
    expect(pref).toBeDefined();
    expect(JSON.parse(pref.channelPreferences).sms).toBe(true);
    expect(pref.quietHoursStart).toBe('22:00');
  });

  it('should save and list chat sessions and messages', async () => {
    await store.saveChatSessionAsync({
      sessionId: 'sesh_abc',
      stakeholderId: 'student_456',
      channel: 'web',
      status: 'bot_active',
      institutionId: 'inst_alpha',
    });

    await store.saveChatMessageAsync({
      messageId: 'cmsg_1',
      sessionId: 'sesh_abc',
      senderType: 'stakeholder',
      text: 'What is my current attendance percentage?',
      institutionId: 'inst_alpha',
    });

    await store.saveChatMessageAsync({
      messageId: 'cmsg_2',
      sessionId: 'sesh_abc',
      senderType: 'bot',
      text: 'Your current attendance is 84.5% across all enrolled subjects.',
      institutionId: 'inst_alpha',
    });

    const session = await store.getChatSessionAsync('sesh_abc', 'inst_alpha');
    expect(session).toBeDefined();

    const messages = await store.listChatMessagesAsync('sesh_abc', 'inst_alpha');
    expect(messages.length).toBe(2);
    expect(messages[0].text).toContain('attendance');
  });

  it('should store translation cache and analytics events', async () => {
    await store.saveTranslationAsync({
      contentHash: 'hash_abc123',
      sourceLanguage: 'en',
      targetLanguage: 'ar',
      sourceText: 'Fee reminder',
      translatedText: 'تذكير بالرسوم',
      institutionId: 'inst_alpha',
    });

    const trans = await store.getTranslationAsync('hash_abc123', 'inst_alpha');
    expect(trans?.translatedText).toBe('تذكير بالرسوم');

    await store.recordAnalyticsEventAsync({
      eventId: 'evt_001',
      eventType: 'open',
      channel: 'email',
      messageId: 'msg_001',
      institutionId: 'inst_alpha',
    });

    const events = await store.listAnalyticsEventsAsync('inst_alpha');
    expect(events.length).toBe(1);
    expect(events[0].eventType).toBe('open');
  });
});
