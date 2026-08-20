import { ChatGateway } from '../../../../operations/engage/conversational/chat-gateway';
import { HumanHandoffManager } from '../../../../operations/engage/conversational/human-handoff';
import { EngageDbStore } from '../../../../db/engage-store';

describe('EngageOS ChatGateway & HumanHandoff Tests', () => {
  let gateway: ChatGateway;
  let handoffManager: HumanHandoffManager;
  let store: EngageDbStore;

  beforeEach(() => {
    gateway = ChatGateway.getInstance();
    handoffManager = HumanHandoffManager.getInstance();
    store = EngageDbStore.getInstance();
    store.clearMemoryStore();
  });

  it('should route normal user inquiry and return assistant answer', async () => {
    const res = await gateway.handleInboundMessage(
      'sesh_gw_1',
      'user_1',
      'What are the campus shuttle timings?',
      'inst_test'
    );

    expect(res.botReplyText).toContain('Campus shuttles run every 20 minutes');
    expect(res.sessionStatus).toBe('bot_active');
  });

  it('should escalate to human handoff queue when requested', async () => {
    const res = await gateway.handleInboundMessage(
      'sesh_gw_2',
      'user_2',
      'I need to talk to a human advisor right now.',
      'inst_test'
    );

    expect(res.sessionStatus).toBe('agent_pending');

    const pending = handoffManager.getPendingQueue();
    expect(pending.length).toBeGreaterThan(0);
    const ticket = pending.find((t) => t.sessionId === 'sesh_gw_2');
    expect(ticket).toBeDefined();

    // Assign agent
    const assigned = await handoffManager.assignAgent(ticket!.ticketId, 'staff_counselor_88', 'inst_test');
    expect(assigned).toBe(true);

    const session = await store.getChatSessionAsync('sesh_gw_2', 'inst_test');
    expect(session?.status).toBe('agent_active');
    expect(session?.assignedAgentId).toBe('staff_counselor_88');
  });
});
