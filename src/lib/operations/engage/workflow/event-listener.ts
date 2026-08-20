import { CampusEventPayload } from './workflow-types';
import { WorkflowEngine } from './workflow-engine';

export class CampusEventListener {
  private static instance: CampusEventListener;
  private workflowEngine: WorkflowEngine;

  private constructor() {
    this.workflowEngine = WorkflowEngine.getInstance();
  }

  public static getInstance(): CampusEventListener {
    if (!CampusEventListener.instance) {
      CampusEventListener.instance = new CampusEventListener();
    }
    return CampusEventListener.instance;
  }

  public async handleEvent(event: CampusEventPayload): Promise<{ triggeredWorkflowsCount: number; runIds: string[] }> {
    return await this.workflowEngine.evaluateEventTriggers(event);
  }
}
