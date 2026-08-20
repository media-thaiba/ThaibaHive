import { SequenceOrchestrator } from '../../../../operations/engage/workflow/sequence-orchestrator';
import { EngageDbStore } from '../../../../db/engage-store';
import { WorkflowNode, CampusEventPayload } from '../../../../operations/engage/workflow/workflow-types';

describe('EngageOS SequenceOrchestrator Multi-Step Drip Tests', () => {
  let orchestrator: SequenceOrchestrator;
  let store: EngageDbStore;

  beforeEach(() => {
    orchestrator = SequenceOrchestrator.getInstance();
    store = EngageDbStore.getInstance();
    store.clearMemoryStore();
  });

  it('should execute send_message node and schedule delay node', async () => {
    const steps: WorkflowNode[] = [
      {
        stepIndex: 0,
        type: 'send_message',
        name: 'Step 1 - Email Reminder',
        config: {
          channel: 'email',
          subject: 'Fee Reminder 1',
          bodyTemplate: 'Dear Student, your fee of ${{amount}} is due soon.',
        },
      },
      {
        stepIndex: 1,
        type: 'delay',
        name: 'Step 2 - Wait 3 days',
        config: {
          delayDurationMinutes: 4320, // 3 days
        },
      },
      {
        stepIndex: 2,
        type: 'send_message',
        name: 'Step 3 - Final SMS',
        config: {
          channel: 'sms',
          bodyTemplate: 'Final Notice: Please pay fee ${{amount}}.',
        },
      },
    ];

    const event: CampusEventPayload = {
      eventName: 'finance.fee.due',
      recipientId: 'student_77',
      recipientAddress: 'student77@example.com',
      eventData: { amount: 600 },
      institutionId: 'inst_test',
    };

    await orchestrator.executeStep('run_drip_01', 'wf_drip', 0, steps, event, 'inst_test');

    const messages = await store.listMessagesAsync('inst_test');
    expect(messages.length).toBe(1);
    expect(messages[0].subject).toBe('Fee Reminder 1');
  });
});
