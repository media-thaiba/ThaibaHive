import { CompensationCoordinator, compensationCoordinator, ExecutedStepRecord, RollbackSummary } from "../workflow/engine/compensation";
import { TenantContext } from "../tools/contract";
import { AgentDbStore, agentDbStore } from "../../db/agent-store";

export interface RollbackRequest {
  runId: string;
  tenant: TenantContext;
  reason: string;
  requestedBy: string;
  steps?: ExecutedStepRecord[];
}

export class GuardrailsRollbackCoordinator {
  private coordinator: CompensationCoordinator;
  private store: AgentDbStore;

  constructor(coordinator?: CompensationCoordinator, store?: AgentDbStore) {
    this.coordinator = coordinator || compensationCoordinator;
    this.store = store || agentDbStore;
  }

  public async initiateRollback(request: RollbackRequest): Promise<RollbackSummary> {
    const { runId, tenant, reason, requestedBy } = request;

    // Retrieve steps from store if not directly supplied
    let stepsToRollback = request.steps;
    if (!stepsToRollback) {
      const persistedSteps = await this.store.listWorkflowSteps(runId);
      stepsToRollback = persistedSteps.map((s) => ({
        stepKey: s.stepKey,
        toolName: (s.output as any)?.toolName || (s.input as any)?.toolName || undefined,
        input: s.input,
        output: s.output,
        status: s.status,
      }));
    }

    const summary = await this.coordinator.rollbackRun(runId, stepsToRollback, tenant);

    // Update workflow run status
    await this.store.updateWorkflowRun(runId, {
      status: summary.success ? "cancelled" : "failed",
      error: summary.success ? `Rolled back: ${reason}` : `Rollback failed: ${summary.failedCompensations.map(f => f.error).join(", ")}`,
      finishedAt: new Date().toISOString(),
    });

    return summary;
  }
}

export const rollbackCoordinator = new GuardrailsRollbackCoordinator();
