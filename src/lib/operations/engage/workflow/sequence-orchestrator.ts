import { WorkflowNode, CampusEventPayload } from './workflow-types';
import { DispatchEngine } from '../dispatch-engine';
import { TemplateEngine } from '../template-engine';
import { EngageDbStore } from '../../../db/engage-store';

export class SequenceOrchestrator {
  private static instance: SequenceOrchestrator;
  private dispatchEngine: DispatchEngine;
  private templateEngine: TemplateEngine;
  private store: EngageDbStore;

  private constructor() {
    this.dispatchEngine = DispatchEngine.getInstance();
    this.templateEngine = TemplateEngine.getInstance();
    this.store = EngageDbStore.getInstance();
  }

  public static getInstance(): SequenceOrchestrator {
    if (!SequenceOrchestrator.instance) {
      SequenceOrchestrator.instance = new SequenceOrchestrator();
    }
    return SequenceOrchestrator.instance;
  }

  public async executeStep(
    runId: string,
    workflowId: string,
    stepIndex: number,
    steps: WorkflowNode[],
    eventPayload: CampusEventPayload,
    institutionId = 'global'
  ): Promise<void> {
    if (!steps || stepIndex >= steps.length) {
      await this.store.saveWorkflowRunAsync({
        runId,
        status: 'completed',
        completedAt: new Date().toISOString(),
        institutionId,
      });
      return;
    }

    const node = steps[stepIndex];

    if (node.type === 'send_message') {
      const channel = node.config.channel || 'email';
      const rawBody = node.config.bodyTemplate || 'Automated notification regarding campus updates.';
      const renderedBody = this.templateEngine.render(rawBody, eventPayload.eventData);
      const renderedSubject = node.config.subject ? this.templateEngine.render(node.config.subject, eventPayload.eventData) : 'Campus Notification';

      const address = eventPayload.recipientAddress || `${eventPayload.recipientId}@example.com`;

      await this.dispatchEngine.dispatchMessage({
        messageId: `msg_wf_${runId}_step_${stepIndex}`,
        campaignId: workflowId,
        recipientId: eventPayload.recipientId,
        recipientType: (eventPayload.recipientType as any) || 'student',
        recipientChannelAddress: address,
        channel,
        priority: node.config.priority || 'standard',
        subject: renderedSubject,
        body: renderedBody,
        personalizedData: eventPayload.eventData,
        institutionId,
      });

      // Advance to next step
      await this.store.saveWorkflowRunAsync({
        runId,
        currentStepIndex: stepIndex + 1,
        institutionId,
      });

      await this.executeStep(runId, workflowId, stepIndex + 1, steps, eventPayload, institutionId);
    } else if (node.type === 'delay') {
      const durationMinutes = node.config.delayDurationMinutes || 60;
      const nextTime = new Date(Date.now() + durationMinutes * 60 * 1000).toISOString();

      await this.store.saveWorkflowRunAsync({
        runId,
        currentStepIndex: stepIndex + 1,
        nextExecutionTime: nextTime,
        status: 'active',
        institutionId,
      });
    } else if (node.type === 'goal_exit') {
      await this.store.saveWorkflowRunAsync({
        runId,
        status: 'completed',
        completedAt: new Date().toISOString(),
        institutionId,
      });
    } else {
      // Default advance
      await this.executeStep(runId, workflowId, stepIndex + 1, steps, eventPayload, institutionId);
    }
  }
}
