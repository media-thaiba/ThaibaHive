import { WorkflowEngine } from '../../../../operations/engage/workflow/workflow-engine';
import { CampusEventListener } from '../../../../operations/engage/workflow/event-listener';
import { EngageDbStore } from '../../../../db/engage-store';

describe('EngageOS WorkflowEngine & Subsystem Event Triggers', () => {
  let engine: WorkflowEngine;
  let listener: CampusEventListener;
  let store: EngageDbStore;

  beforeEach(() => {
    engine = WorkflowEngine.getInstance();
    listener = CampusEventListener.getInstance();
    store = EngageDbStore.getInstance();
    store.clearMemoryStore();
  });

  it('should trigger automated workflow when attendance deficit event occurs', async () => {
    // Register workflow
    await store.saveWorkflowAsync({
      workflowId: 'wf_attendance_warning',
      name: 'Attendance Deficit Remediation',
      triggerEvent: 'student.attendance.deficit',
      triggerConditionData: JSON.stringify({ attendancePct: { lt: 75 } }),
      stepsData: JSON.stringify([
        {
          stepIndex: 0,
          type: 'send_message',
          name: 'Send Warning SMS to Parent',
          config: {
            channel: 'sms',
            priority: 'high',
            bodyTemplate: 'Alert: {{studentName}} attendance has dropped to {{attendancePct}}%.',
          },
        },
      ]),
      isActive: true,
      institutionId: 'inst_test',
    });

    const result = await listener.handleEvent({
      eventName: 'student.attendance.deficit',
      recipientId: 'student_99',
      recipientType: 'parent',
      recipientAddress: '+14155550144',
      eventData: {
        studentName: 'Yusuf',
        attendancePct: 71.5,
      },
      institutionId: 'inst_test',
    });

    expect(result.triggeredWorkflowsCount).toBe(1);
    expect(result.runIds.length).toBe(1);

    const messages = await store.listMessagesAsync('inst_test');
    expect(messages.length).toBe(1);
    expect(messages[0].body).toBe('Alert: Yusuf attendance has dropped to 71.5%.');
  });

  it('should ignore event when trigger condition is not met', async () => {
    await store.saveWorkflowAsync({
      workflowId: 'wf_attendance_warning_2',
      name: 'Attendance Warning 2',
      triggerEvent: 'student.attendance.deficit',
      triggerConditionData: JSON.stringify({ attendancePct: { lt: 75 } }),
      stepsData: JSON.stringify([]),
      isActive: true,
      institutionId: 'inst_test',
    });

    const result = await listener.handleEvent({
      eventName: 'student.attendance.deficit',
      recipientId: 'student_100',
      eventData: {
        attendancePct: 82.0, // not < 75
      },
      institutionId: 'inst_test',
    });

    expect(result.triggeredWorkflowsCount).toBe(0);
  });
});
