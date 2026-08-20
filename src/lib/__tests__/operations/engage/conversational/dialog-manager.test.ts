import { DialogManager } from '../../../../operations/engage/conversational/dialog-manager';
import { EngageDbStore } from '../../../../db/engage-store';

describe('EngageOS DialogManager Tests', () => {
  let dialogManager: DialogManager;
  let store: EngageDbStore;

  beforeEach(() => {
    dialogManager = DialogManager.getInstance();
    store = EngageDbStore.getInstance();
    store.clearMemoryStore();
  });

  it('should process multi-turn attendance inquiry and save conversation history', async () => {
    const res = await dialogManager.processUserMessage(
      'sesh_test_101',
      'student_42',
      'Hi, what is my attendance right now?',
      'inst_test'
    );

    expect(res.activeIntent).toBe('check_attendance');
    expect(res.botReplyText).toContain('attendance is 87.4%');
    expect(res.sessionStatus).toBe('bot_active');
    expect(res.suggestedActions?.length).toBeGreaterThan(0);

    const history = await store.listChatMessagesAsync('sesh_test_101', 'inst_test');
    expect(history.length).toBe(2); // user + bot
  });

  it('should transition session to agent_pending when user requests human support', async () => {
    const res = await dialogManager.processUserMessage(
      'sesh_test_102',
      'student_43',
      'I want to speak with a human counselor please.',
      'inst_test'
    );

    expect(res.activeIntent).toBe('human_agent_request');
    expect(res.sessionStatus).toBe('agent_pending');
    expect(res.botReplyText).toContain('connecting you with an on-duty staff counselor');
  });

  it('should answer institutional knowledge base queries', async () => {
    const res = await dialogManager.processUserMessage(
      'sesh_test_103',
      'student_44',
      'What are the library hours today?',
      'inst_test'
    );

    expect(res.botReplyText).toContain('Library is open Monday–Friday');
    expect(res.suggestedActions?.[0].url).toBe('/portal/library/booking');
  });
});
