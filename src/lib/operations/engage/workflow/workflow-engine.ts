import { CampusEventPayload, WorkflowDefinition } from './workflow-types';
import { SequenceOrchestrator } from './sequence-orchestrator';
import { EngageDbStore } from '../../../db/engage-store';

export class WorkflowEngine {
  private static instance: WorkflowEngine;
  private store: EngageDbStore;
  private orchestrator: SequenceOrchestrator;

  private constructor() {
    this.store = EngageDbStore.getInstance();
    this.orchestrator = SequenceOrchestrator.getInstance();
  }

  public static getInstance(): WorkflowEngine {
    if (!WorkflowEngine.instance) {
      WorkflowEngine.instance = new WorkflowEngine();
    }
    return WorkflowEngine.instance;
  }

  public async evaluateEventTriggers(
    event: CampusEventPayload
  ): Promise<{ triggeredWorkflowsCount: number; runIds: string[] }> {
    const institutionId = event.institutionId || 'global';
    const allWorkflows = await this.store.listWorkflowsAsync(institutionId);

    const matchingWorkflows = allWorkflows.filter((wf) => {
      if (!wf.isActive) return false;
      if (wf.triggerEvent !== event.eventName) return false;

      // Evaluate trigger conditions if present
      if (wf.triggerConditionData && wf.triggerConditionData !== '{}') {
        try {
          const condition = JSON.parse(wf.triggerConditionData);
          for (const [key, val] of Object.entries(condition)) {
            if (typeof val === 'object' && val !== null) {
              const cond = val as any;
              const actual = event.eventData[key];
              if (cond.lt !== undefined && actual >= cond.lt) return false;
              if (cond.gt !== undefined && actual <= cond.gt) return false;
              if (cond.eq !== undefined && actual !== cond.eq) return false;
            } else if (event.eventData[key] !== val) {
              return false;
            }
          }
        } catch {
          // Ignore parse errors
        }
      }
      return true;
    });

    const runIds: string[] = [];

    for (const wf of matchingWorkflows) {
      const runId = `wfrun_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
      await this.store.saveWorkflowRunAsync({
        runId,
        workflowId: wf.workflowId,
        recipientId: event.recipientId,
        currentStepIndex: 0,
        status: 'active',
        stateData: JSON.stringify({
          eventData: event.eventData,
          recipientAddress: event.recipientAddress,
          recipientType: event.recipientType || 'student',
        }),
        institutionId,
      });

      runIds.push(runId);

      // Execute sequence step 0
      let steps = [];
      try {
        steps = JSON.parse(wf.stepsData || '[]');
      } catch {}

      await this.orchestrator.executeStep(runId, wf.workflowId, 0, steps, event, institutionId);
    }

    return {
      triggeredWorkflowsCount: matchingWorkflows.length,
      runIds,
    };
  }
}
